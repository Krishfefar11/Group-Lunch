/**
 * executor.js — Execute LLM tool calls against the real database
 *
 * Each function here corresponds to a tool defined in definitions.js.
 * These are the only functions that touch the DB or external services.
 */

const { Op }      = require('sequelize');
const Groq        = require('groq-sdk');
const { Session, Preference, Restaurant, SessionMember } = require('../../models/index');
const { getRestaurantsForCity } = require('../../services/places');
const { topsisRecommend, detectConflict } = require('../recommend');
const { ConflictResolutionSchema, safeParse } = require('../schemas');
const log = require('../../utils/logger');

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── Tool implementations ──────────────────────────────────────────────────────

async function getSessionStatus(sessionId) {
  const [session, members] = await Promise.all([
    Session.findOne({ where: { sessionUuid: sessionId } }),
    SessionMember.findAll({ where: { sessionUuid: sessionId } }),
  ]);
  if (!session) return { error: 'Session not found' };

  const submitted = members.filter((m) => m.hasSubmittedPreference);
  const pending   = members.filter((m) => !m.hasSubmittedPreference);

  return {
    status:       session.status,
    city:         session.deliveryCity || 'Bangalore',
    totalMembers: members.length,
    submitted:    submitted.length,
    pendingNames: pending.map((m) => m.memberName),
    allIn:        pending.length === 0 && submitted.length > 0,
  };
}

async function getMemberPreferences(sessionId) {
  const prefs = await Preference.findAll({ where: { sessionUuid: sessionId } });
  if (!prefs.length) return { count: 0, preferences: [], message: 'No preferences submitted yet.' };

  return {
    count: prefs.length,
    preferences: prefs.map((p) => ({
      memberName: p.memberName,
      cuisine:    p.cuisine   || [],
      diet:       p.diet      || [],
      budget:     p.budget    || 'any',
    })),
  };
}

async function analyzeConflict(sessionId) {
  const prefs = await Preference.findAll({ where: { sessionUuid: sessionId } });
  if (!prefs.length) return { hasConflict: false, message: 'No preferences to analyse yet.' };

  const plain = prefs.map((p) => ({ memberName: p.memberName, cuisine: p.cuisine || [], diet: p.diet || [], budget: p.budget || 'any' }));
  const { hasConflict, cuisineMap, universalCuisines } = detectConflict(plain);

  const budgets    = plain.map((p) => p.budget);
  const budgetConflict = budgets.includes('under200') && budgets.includes('200to400');

  const dietaryConflict = (() => {
    const needsVeg  = plain.some((p) => (p.diet || []).includes('veg'));
    const needsJain = plain.some((p) => (p.diet || []).includes('jain'));
    return needsVeg || needsJain;
  })();

  const campLines = [...cuisineMap.entries()]
    .map(([c, members]) => `${c} (${members.join(', ')})`)
    .join('; ');

  return {
    hasConflict: hasConflict || budgetConflict,
    cuisineConflict:  hasConflict,
    budgetConflict,
    dietaryRestriction: dietaryConflict,
    cuisineCamps:       campLines,
    universalCuisines,
    summary: hasConflict
      ? `Cuisine conflict — ${campLines}`
      : budgetConflict
        ? `Budget gap: some members have different budget ranges`
        : 'No significant conflicts detected',
  };
}

async function searchRestaurants(sessionId, { cuisines, vegOnly, maxPrice } = {}) {
  const session = await Session.findOne({ where: { sessionUuid: sessionId } });
  const city = session?.deliveryCity || 'Bangalore';

  const cacheThreshold = new Date(Date.now() - CACHE_TTL_MS);
  let restaurants = await Restaurant.findAll({
    where: { city, cachedAt: { [Op.gte]: cacheThreshold } },
  });

  if (restaurants.length < 3) {
    log.info({ city }, 'Tool: fetching restaurants from places API');
    const fetched = await getRestaurantsForCity(city, cuisines || []);
    for (const r of fetched) {
      const [record] = await Restaurant.findOrCreate({ where: { placeId: r.placeId }, defaults: r });
      if (record.id) await record.update(r);
    }
    restaurants = await Restaurant.findAll({ where: { city } });
  }

  let pool = restaurants;
  if (vegOnly)  pool = pool.filter((r) => r.vegFriendly);
  if (maxPrice) pool = pool.filter((r) => r.pricePerPerson <= maxPrice);

  return {
    count: pool.length,
    city,
    restaurants: pool.map((r) => ({
      id:              r.id,
      name:            r.name,
      cuisines:        r.cuisines   || [],
      rating:          parseFloat(r.rating) || 0,
      deliveryTimeMin: r.deliveryTimeMin,
      pricePerPerson:  r.pricePerPerson,
      vegFriendly:     r.vegFriendly,
      jainFriendly:    r.jainFriendly,
    })),
  };
}

async function rankRestaurants(sessionId, restaurantIds) {
  const [prefs, restaurants] = await Promise.all([
    Preference.findAll({ where: { sessionUuid: sessionId } }),
    Restaurant.findAll({ where: { id: restaurantIds } }),
  ]);

  if (!prefs.length || !restaurants.length) return { ranked: [], error: 'Insufficient data for ranking' };

  const results = topsisRecommend(
    restaurants.map((r) => r.toJSON()),
    prefs.map((p) => p.toJSON()),
  );

  return {
    count: results.length,
    ranked: results.map((r) => ({
      id:    r.restaurant.id,
      name:  r.restaurant.name,
      score: r.score,
      reason: r.reason,
      cuisines: r.restaurant.cuisines,
      matchCount: r.matchCount,
    })),
  };
}

async function generateConflictResolution(sessionId) {
  if (!process.env.GROQ_API_KEY) return { error: 'LLM not configured' };

  const prefs = await Preference.findAll({ where: { sessionUuid: sessionId } });
  if (!prefs.length) return { hasConflict: false, explanation: 'No preferences submitted yet.' };

  const plain = prefs.map((p) => ({ memberName: p.memberName, cuisine: p.cuisine, diet: p.diet, budget: p.budget }));

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = `Analyse this group's food preferences and resolve any conflicts diplomatically.

GROUP PREFERENCES:
${plain.map((p) => `- ${p.memberName}: cuisine=${JSON.stringify(p.cuisine)}, diet=${JSON.stringify(p.diet)}, budget=${p.budget}`).join('\n')}

Respond ONLY with valid JSON (no markdown):
{
  "hasConflict": true/false,
  "conflictType": "cuisine" | "budget" | "dietary" | "multi" | "none",
  "explanation": "A friendly 1-2 sentence explanation of what the conflict is",
  "compromise": "A concrete 1-2 sentence suggestion that satisfies the most people",
  "suggestions": ["Specific action 1", "Specific action 2", "Specific action 3"]
}`;

  const completion = await client.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens:  400,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '{}';
  const { data, error } = safeParse(ConflictResolutionSchema, raw);
  return data || { hasConflict: false, explanation: 'Could not analyse conflict.', error };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
async function executeTool(toolName, args) {
  const { sessionId, ...rest } = args;
  switch (toolName) {
    case 'get_session_status':         return getSessionStatus(sessionId);
    case 'get_member_preferences':     return getMemberPreferences(sessionId);
    case 'analyze_conflict':           return analyzeConflict(sessionId);
    case 'search_restaurants':         return searchRestaurants(sessionId, rest);
    case 'rank_restaurants':           return rankRestaurants(sessionId, rest.restaurantIds || []);
    case 'generate_conflict_resolution': return generateConflictResolution(sessionId);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

module.exports = { executeTool };

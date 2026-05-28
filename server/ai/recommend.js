const Groq = require('groq-sdk');

const BUDGET_MAX = { under200: 200, '200to400': 400, any: 9999 };

// ── Fallback: pure scoring (used when Groq API is unavailable) ────────────────
function scoringFallback(preferences, restaurants) {
  const needsJain = preferences.some((p) => (p.diet || []).includes('jain'));
  const needsVeg  = preferences.some((p) => (p.diet || []).includes('veg'));

  const scored = restaurants.map((r) => {
    let score = 0;
    const reasons = [];
    const cuisines = r.cuisines || [];

    const matchingMembers = preferences.filter((p) => {
      const prefCuisines = p.cuisine || [];
      if (prefCuisines.includes('Any')) return true;
      return prefCuisines.some((c) => cuisines.includes(c));
    });
    score += matchingMembers.length * 3;
    if (matchingMembers.length > 0) {
      reasons.push(`${matchingMembers.length}/${preferences.length} people wanted ${cuisines[0]}`);
    }

    const budgetMatches = preferences.filter((p) => {
      const max = BUDGET_MAX[p.budget] || 9999;
      return r.pricePerPerson <= max;
    });
    score += budgetMatches.length * 2;
    if (budgetMatches.length === preferences.length) reasons.push("fits everyone's budget");
    else if (budgetMatches.length > 0) reasons.push(`fits ${budgetMatches.length}/${preferences.length} budgets`);

    const ratingBonus = Math.max(0, (r.rating - 3.5) * 4);
    score += ratingBonus;
    if (r.rating >= 4.3) reasons.push(`highly rated ⭐${r.rating}`);

    const deliveryPenalty = Math.max(0, Math.floor((r.deliveryTimeMin - 25) / 10));
    score -= deliveryPenalty;
    if (r.deliveryTimeMin <= 25) reasons.push(`fast delivery (${r.deliveryTimeMin} min)`);

    if (needsVeg  && r.vegFriendly)  reasons.push('veg-friendly ✅');
    if (needsJain && r.jainFriendly) reasons.push('jain-friendly ✅');

    return {
      restaurant: r,
      score:      Math.round(score * 10) / 10,
      reason:     reasons.slice(0, 3).join(' · ') || 'Good all-rounder',
      matchCount: matchingMembers.length,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

// ── Main: AI-powered recommendation via Groq (LLaMA 3) ───────────────────────
async function recommend(preferences, restaurants) {
  if (!preferences.length || !restaurants.length) return [];

  // Hard dietary filters
  const needsJain = preferences.some((p) => (p.diet || []).includes('jain'));
  const needsVeg  = preferences.some((p) => (p.diet || []).includes('veg'));

  let filtered = restaurants.filter((r) => {
    if (needsJain && !r.jainFriendly) return false;
    if (needsVeg  && !r.vegFriendly)  return false;
    return true;
  });
  if (filtered.length === 0) filtered = restaurants.filter((r) => (needsVeg ? r.vegFriendly : true));
  if (filtered.length === 0) filtered = restaurants;

  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not set — using scoring fallback');
    return scoringFallback(preferences, filtered);
  }

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const memberSummary = preferences.map((p) => ({
    name:    p.memberName,
    diet:    p.diet    || [],
    cuisine: p.cuisine || [],
    budget:  p.budget,
  }));

  const restaurantSummary = filtered.map((r) => ({
    id:              r.id,
    name:            r.name,
    cuisines:        r.cuisines,
    rating:          parseFloat(r.rating),
    deliveryTimeMin: r.deliveryTimeMin,
    pricePerPerson:  r.pricePerPerson,
    vegFriendly:     r.vegFriendly,
    jainFriendly:    r.jainFriendly,
  }));

  const prompt = `You are a restaurant recommendation engine for a group lunch app. Pick the TOP 3 restaurants for this group.

GROUP (${preferences.length} members):
${JSON.stringify(memberSummary, null, 2)}

RESTAURANTS:
${JSON.stringify(restaurantSummary, null, 2)}

BUDGET KEY: "under200" = ≤₹200/person · "200to400" = ≤₹400/person · "any" = no limit

Rules:
- NEVER pick a restaurant that violates a veg/jain requirement
- Prioritise cuisine matches, then budget fit, then rating, then delivery speed
- "matchCount" = number of members whose cuisine preference this restaurant satisfies

Reply with ONLY valid JSON — no markdown, no explanation:
[
  { "restaurantId": <id>, "score": <0-100>, "reason": "<max 10 words>", "matchCount": <number> },
  { "restaurantId": <id>, "score": <0-100>, "reason": "<max 10 words>", "matchCount": <number> },
  { "restaurantId": <id>, "score": <0-100>, "reason": "<max 10 words>", "matchCount": <number> }
]`;

  try {
    const completion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens:  400,
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    // Strip accidental markdown code fences if model adds them
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty or invalid response from Groq');
    }

    const results = parsed.slice(0, 3).map((item) => {
      const restaurant = filtered.find((r) => r.id === item.restaurantId);
      if (!restaurant) return null;
      return {
        restaurant,
        score:      item.score      ?? 0,
        reason:     item.reason     || 'Recommended by AI',
        matchCount: item.matchCount ?? 0,
      };
    }).filter(Boolean);

    if (results.length === 0) throw new Error('No valid restaurants matched in AI response');

    console.log(`✅ Groq AI returned ${results.length} recommendations`);
    return results;

  } catch (err) {
    console.error('⚠️  Groq API error — falling back to scoring:', err.message);
    return scoringFallback(preferences, filtered);
  }
}

module.exports = { recommend };

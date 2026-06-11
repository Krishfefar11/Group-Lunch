/**
 * conflictAgent.js — A7: LLM-powered conflict detection + negotiation
 *
 * Detects cuisine/budget/dietary conflicts in a group and generates
 * a human-readable compromise suggestion the organiser can share.
 */

const Groq = require('groq-sdk');
const { ConflictResolutionSchema, safeParse } = require('../schemas');
const { detectConflict } = require('../recommend');
const log = require('../../utils/logger');

/**
 * Analyse conflicts and generate a negotiation message.
 *
 * @param {Array}  preferences — array of { memberName, cuisine, diet, budget }
 * @returns {Promise<{hasConflict, conflictType, explanation, compromise, suggestions}>}
 */
async function resolveConflict(preferences) {
  const fallback = {
    hasConflict:  false,
    conflictType: 'none',
    explanation:  'No significant conflicts detected.',
    compromise:   'The group has compatible preferences.',
    suggestions:  ['Proceed with AI recommendation'],
  };

  if (!preferences || preferences.length < 2) return fallback;

  // ── Quick algorithmic conflict check ────────────────────────────────────
  const { hasConflict: cuisineConflict, cuisineMap } = detectConflict(preferences);
  const budgets = preferences.map((p) => p.budget);
  const budgetConflict  = budgets.includes('under200') && budgets.includes('200to400');
  const dietaryNeeds    = preferences.some((p) => (p.diet || []).some((d) => d !== 'none'));

  const anyConflict = cuisineConflict || budgetConflict;

  // If no conflict, return early without spending an LLM call
  if (!anyConflict) {
    const hasDietary = preferences.some((p) => (p.diet || []).some((d) => ['veg','jain'].includes(d)));
    if (!hasDietary) return fallback;
  }

  // ── LLM negotiation ──────────────────────────────────────────────────────
  if (!process.env.GROQ_API_KEY) {
    // Deterministic fallback without LLM
    const camps = [...cuisineMap.entries()].map(([c, m]) => `${c} (${m.join(', ')})`);
    return {
      hasConflict:  anyConflict,
      conflictType: cuisineConflict ? 'cuisine' : budgetConflict ? 'budget' : 'dietary',
      explanation:  cuisineConflict
        ? `Cuisine conflict: ${camps.join(' vs ')}`
        : `Budget gap: some members prefer cheaper options`,
      compromise:   'The AI will pick a restaurant that covers the most members\' preferences.',
      suggestions:  ['Let AI pick a compromise restaurant', 'Discuss and update preferences', 'Order from multiple places'],
    };
  }

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prefLines = preferences
    .map((p) => `- ${p.memberName}: cuisine=${JSON.stringify(p.cuisine)}, diet=${JSON.stringify(p.diet)}, budget=${p.budget}`)
    .join('\n');

  const prompt = `You are a friendly group lunch mediator. Analyse these preferences and resolve conflicts.

PREFERENCES:
${prefLines}

Return ONLY valid JSON (no markdown):
{
  "hasConflict": true/false,
  "conflictType": "cuisine" | "budget" | "dietary" | "multi" | "none",
  "explanation": "2 sentences max — friendly, mention specific names, explain what's clashing",
  "compromise": "1-2 sentence concrete compromise idea that makes most people happy",
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"]
}`;

  try {
    const completion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens:  350,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
    const { data, error } = safeParse(ConflictResolutionSchema, raw);

    if (error) {
      log.warn({ error }, 'conflictAgent: schema validation failed');
      return fallback;
    }

    return data;
  } catch (err) {
    log.error({ err }, 'conflictAgent: LLM call failed');
    return fallback;
  }
}

module.exports = { resolveConflict };

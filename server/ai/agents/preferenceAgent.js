/**
 * preferenceAgent.js — A4: Natural-language preference extraction
 *
 * Converts free-form text ("I'm veg, prefer Chinese, tight budget")
 * into a validated structured preference object.
 *
 * Uses Groq LLM + Zod schema validation so hallucinated values are
 * caught and corrected before reaching the DB.
 */

const Groq = require('groq-sdk');
const { ExtractedPreferenceSchema, safeParse } = require('../schemas');
const log = require('../../utils/logger');

// Maps informal language the LLM might return → canonical enum values
const CUISINE_ALIASES = {
  'north indian': 'North Indian', northindian: 'North Indian', 'ni': 'North Indian',
  'south indian': 'South Indian', southindian: 'South Indian', 'si': 'South Indian',
  'chinese':      'Chinese',
  'pizza':        'Pizza',
  'biryani':      'Biryani',
  'burgers':      'Burgers', 'burger': 'Burgers',
  'wraps':        'Wraps',   'wrap': 'Wraps',
  'continental':  'Continental',
  'breakfast':    'Breakfast',
  'any':          'Any', 'anything': 'Any', 'all': 'Any',
};

const DIET_ALIASES = {
  'vegetarian': 'veg', 'veg': 'veg', 'veggie': 'veg', 'plant based': 'veg',
  'jain':       'jain',
  'no peanuts': 'no-peanuts', 'nopeanuts': 'no-peanuts', 'peanut allergy': 'no-peanuts',
  'no spicy':   'no-spicy',   'nospicy': 'no-spicy', 'mild': 'no-spicy', 'not spicy': 'no-spicy',
  'none':       'none',       'no restrictions': 'none', 'anything': 'none',
};

const BUDGET_ALIASES = {
  'under 200': 'under200', 'under200': 'under200', 'cheap': 'under200', 'budget': 'under200',
  '200 to 400': '200to400', '200to400': '200to400', 'moderate': '200to400', 'medium': '200to400',
  'any': 'any', 'no limit': 'any', 'sky is the limit': 'any',
};

/**
 * Extract structured preferences from free-form text.
 * Falls back to sensible defaults if the LLM or validation fails.
 *
 * @param {string} text  — The raw user message
 * @returns {Promise<{cuisine: string[], diet: string[], budget: string, confidence: number, rawText: string}>}
 */
async function extractPreferences(text) {
  const fallback = { cuisine: ['Any'], diet: ['none'], budget: 'any', confidence: 0, rawText: text };

  if (!text?.trim()) return fallback;
  if (!process.env.GROQ_API_KEY) return fallback;

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Extract food preferences from this user message.

USER MESSAGE: "${text}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "cuisine": ["one or more from: North Indian, South Indian, Biryani, Chinese, Pizza, Burgers, Wraps, Continental, Breakfast, Any"],
  "diet": ["one or more from: veg, jain, no-peanuts, no-spicy, none"],
  "budget": "one of: under200, 200to400, any",
  "confidence": 0.0 to 1.0 based on how clear the user's preferences are
}

Rules:
- If the user says "vegetarian", "veg", "no meat" → diet includes "veg"
- If the user says "jain" → diet includes "jain"
- If the user says "no spicy", "mild", "not spicy" → diet includes "no-spicy"
- If no dietary restrictions mentioned → diet: ["none"]
- If budget under ₹200 or "cheap" → "under200"; ₹200–400 or "moderate" → "200to400"; no preference → "any"
- If no cuisine preference → ["Any"]
- Always return arrays for cuisine and diet (even single items)`;

  try {
    const completion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens:  200,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
    const { data, error } = safeParse(ExtractedPreferenceSchema, raw);

    if (error) {
      log.warn({ error, raw }, 'preferenceAgent: schema validation failed, using fallback');
      return fallback;
    }

    // Normalise any alias values the LLM might have used
    const cuisine = (data.cuisine || []).map((c) => CUISINE_ALIASES[c.toLowerCase()] || c);
    const diet    = (data.diet    || []).map((d) => DIET_ALIASES[d.toLowerCase()]    || d);
    const budget  = BUDGET_ALIASES[data.budget?.toLowerCase()] || data.budget || 'any';

    // Re-validate after normalisation (quick safeParse)
    const normalised = { cuisine, diet, budget };
    const check = ExtractedPreferenceSchema.safeParse(normalised);
    if (!check.success) {
      log.warn({ normalised, err: check.error.message }, 'preferenceAgent: normalised value still invalid');
      return { ...fallback, confidence: 0.2 };
    }

    log.info({ extracted: normalised }, 'preferenceAgent: preferences extracted');
    return { ...normalised, confidence: data.confidence || 0.8, rawText: text };
  } catch (err) {
    log.error({ err }, 'preferenceAgent: LLM call failed');
    return fallback;
  }
}

module.exports = { extractPreferences };

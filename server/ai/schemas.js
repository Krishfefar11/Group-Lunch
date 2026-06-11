/**
 * schemas.js — Zod validation schemas for all LLM outputs
 *
 * Every response the LLM produces is validated against one of these schemas
 * before it reaches business logic. If validation fails the system falls
 * back gracefully instead of crashing or silently using bad data.
 */

const { z } = require('zod');

// ── Valid enum values (shared across schemas) ────────────────────────────────
const CuisineEnum = z.enum([
  'North Indian', 'South Indian', 'Biryani', 'Chinese', 'Pizza',
  'Burgers', 'Wraps', 'Continental', 'Breakfast', 'Any',
  // Accept the compact IDs the existing chat route uses too
  'NorthIndian', 'SouthIndian',
]);

const DietEnum   = z.enum(['veg', 'jain', 'no-peanuts', 'no-spicy', 'none']);
const BudgetEnum = z.enum(['under200', '200to400', 'any']);

// ── A4: Natural-language preference extraction ───────────────────────────────
const ExtractedPreferenceSchema = z.object({
  cuisine:    z.array(CuisineEnum).min(1, 'At least one cuisine required'),
  diet:       z.array(DietEnum).min(1, 'At least one diet tag required'),
  budget:     BudgetEnum,
  confidence: z.number().min(0).max(1).optional(),   // LLM often returns this; accept it
  rawText:    z.string().optional(),                  // echoed back by some prompts
});

// ── A1/A2: Single restaurant recommendation object ───────────────────────────
const RestaurantPickSchema = z.object({
  restaurantName: z.string().min(1),
  score:          z.number().int().min(60).max(100),
  reason:         z.string().min(5),
  matchCount:     z.number().int().min(0),
});

// ── A1/A2: Full recommendation array (1–3 picks) ────────────────────────────
const RecommendationSchema = z.array(RestaurantPickSchema).min(1).max(3);

// ── A7: Conflict resolution output ──────────────────────────────────────────
const ConflictResolutionSchema = z.object({
  hasConflict:   z.boolean(),
  conflictType:  z.enum(['cuisine', 'budget', 'dietary', 'multi', 'none']),
  // Human-readable explanation shown in the agent panel
  explanation:   z.string().min(10),
  // Suggested compromise message the organiser can share with the group
  compromise:    z.string().min(10),
  // 1-3 concrete action suggestions
  suggestions:   z.array(z.string()).min(1).max(3),
});

// ── A3: Agent reasoning step (one SSE event) ────────────────────────────────
const AgentStepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('thinking'),    text: z.string() }),
  z.object({ type: z.literal('tool_call'),   tool: z.string(), args: z.record(z.unknown()) }),
  z.object({ type: z.literal('tool_result'), tool: z.string(), result: z.unknown() }),
  z.object({ type: z.literal('tool_error'),  tool: z.string(), error: z.string() }),
  z.object({ type: z.literal('agent'),       agent: z.string(), status: z.string() }),
  z.object({ type: z.literal('done'),        text: z.string() }),
  z.object({ type: z.literal('error'),       text: z.string() }),
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely parse + validate LLM JSON output.
 * Strips markdown fences, extracts first JSON structure, validates with schema.
 * Returns { data, error } — never throws.
 */
function safeParse(schema, raw) {
  try {
    // Strip markdown code fences
    let clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Extract JSON object or array
    const objStart   = clean.indexOf('{');
    const arrStart   = clean.indexOf('[');
    const start      = objStart === -1 ? arrStart
                     : arrStart === -1 ? objStart
                     : Math.min(objStart, arrStart);

    if (start === -1) throw new Error('No JSON found in LLM response');

    // Balance-bracket extraction (handles nested structures)
    const opener  = clean[start];
    const closer  = opener === '{' ? '}' : ']';
    let depth = 0, end = -1;
    for (let i = start; i < clean.length; i++) {
      if (clean[i] === opener)  depth++;
      if (clean[i] === closer) { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) throw new Error('Unbalanced JSON in LLM response');

    const jsonStr = clean.slice(start, end + 1)
      .replace(/:\s*True\b/g,  ': true')   // Python-style booleans
      .replace(/:\s*False\b/g, ': false');

    const parsed = JSON.parse(jsonStr);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return { data: null, error: result.error.message };
    }
    return { data: result.data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

module.exports = {
  CuisineEnum,
  DietEnum,
  BudgetEnum,
  ExtractedPreferenceSchema,
  RestaurantPickSchema,
  RecommendationSchema,
  ConflictResolutionSchema,
  AgentStepSchema,
  safeParse,
};

/**
 * orchestrator.js — A6: Agent coordinator
 *
 * The orchestrator knows the full session lifecycle and decides:
 *   1. Which task to assign to which agent
 *   2. What context to inject into the ReAct loop system prompt
 *   3. How to compose a final result from multiple agent outputs
 *
 * It does NOT call the LLM directly — it builds the system prompt and
 * delegates execution to reactLoop.js.
 */

const { Session, Preference, SessionMember } = require('../../models/index');
const { detectConflict } = require('../recommend');
const log = require('../../utils/logger');

/**
 * Build the system prompt for the ReAct loop based on session context.
 * The richer the prompt, the fewer tool calls the agent needs.
 */
async function buildSystemPrompt(sessionId) {
  const [session, members, preferences] = await Promise.all([
    Session.findOne({ where: { sessionUuid: sessionId } }),
    SessionMember.findAll({ where: { sessionUuid: sessionId } }),
    Preference.findAll({ where: { sessionUuid: sessionId } }),
  ]);

  const submitted = members.filter((m) => m.hasSubmittedPreference);
  const pending   = members.filter((m) => !m.hasSubmittedPreference);
  const city      = session?.deliveryCity || 'Bangalore';

  // Pre-compute conflict state so the agent doesn't need to re-discover it
  const plainPrefs = preferences.map((p) => ({ memberName: p.memberName, cuisine: p.cuisine || [], diet: p.diet || [], budget: p.budget || 'any' }));
  const { hasConflict, cuisineMap } = detectConflict(plainPrefs);
  const needsVeg  = preferences.some((p) => (p.diet || []).includes('veg'));
  const needsJain = preferences.some((p) => (p.diet || []).includes('jain'));

  const conflictContext = hasConflict
    ? `⚠️ CONFLICT DETECTED: Members want different cuisines — ${[...cuisineMap.entries()].map(([c, m]) => `${c} (${m.join(', ')})`).join(' vs ')}. Your recommendations MUST include at least one option per cuisine camp.`
    : 'No cuisine conflicts detected.';

  const dietaryContext = needsJain
    ? '🚨 DIETARY CONSTRAINT: At least one member is Jain. ONLY recommend jain-friendly restaurants.'
    : needsVeg
      ? '🚨 DIETARY CONSTRAINT: At least one member is vegetarian. ONLY recommend veg-friendly restaurants.'
      : 'No hard dietary restrictions.';

  return `You are a smart group lunch coordinator agent for GroupLunch.

SESSION CONTEXT:
- City: ${city}
- Members: ${members.length} total, ${submitted.length} submitted preferences, ${pending.length} pending
- Pending members: ${pending.map((m) => m.memberName).join(', ') || 'none'}

CONFLICT ANALYSIS:
${conflictContext}

DIETARY REQUIREMENTS:
${dietaryContext}

YOUR TOOLS (use in this preferred order):
1. get_session_status       → confirm who has submitted
2. get_member_preferences   → read what everyone wants
3. analyze_conflict         → detailed conflict analysis (if needed)
4. search_restaurants       → get available restaurants for the city
5. rank_restaurants         → score restaurants using TOPSIS fairness algorithm
6. generate_conflict_resolution → if conflicts exist, generate a negotiation message

INSTRUCTIONS:
- Be methodical: call tools in order, reason about results before next call
- For dietary restrictions, pass vegOnly: true to search_restaurants
- After ranking, your final answer should include: top recommendation, why it's fair to everyone, any caveats
- Keep the final answer concise, friendly, and mention specific member names
- Always finish with a clear recommendation — never leave the group without a pick`;
}

/**
 * Determine the task description based on what the session needs.
 */
async function determineTask(sessionId, userTask) {
  if (userTask) return userTask;

  const [session, prefs] = await Promise.all([
    Session.findOne({ where: { sessionUuid: sessionId } }),
    Preference.findAll({ where: { sessionUuid: sessionId } }),
  ]);

  if (!prefs.length) return 'Check session status and tell me who still needs to submit preferences.';
  if (session?.status === 'collecting') return 'Find the best restaurant for this group based on all submitted preferences.';
  return 'Provide an update on the current session status.';
}

/**
 * Entry point for the orchestrator.
 * Builds context, determines task, returns { systemPrompt, task } for reactLoop.
 */
async function orchestrate(sessionId, userTask) {
  log.info({ sessionId, userTask }, 'orchestrator: starting');
  const [systemPrompt, task] = await Promise.all([
    buildSystemPrompt(sessionId),
    determineTask(sessionId, userTask),
  ]);
  log.debug({ sessionId, task }, 'orchestrator: context built');
  return { systemPrompt, task };
}

module.exports = { orchestrate };

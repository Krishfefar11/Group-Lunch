/**
 * definitions.js — Tool specs passed to the Groq LLM
 *
 * These follow the OpenAI function-calling schema.
 * The LLM decides which tool to call and with what arguments;
 * executor.js handles the actual execution.
 */

const TOOLS = [
  // ── Session awareness ──────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name:        'get_session_status',
      description: 'Get the current session state — how many members joined, who submitted preferences, what stage the session is at.',
      parameters: {
        type:       'object',
        properties: {
          sessionId: { type: 'string', description: 'The session UUID' },
        },
        required: ['sessionId'],
      },
    },
  },

  // ── Preference access ──────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name:        'get_member_preferences',
      description: 'Retrieve all submitted food preferences for this session (cuisine, dietary restrictions, budget per member).',
      parameters: {
        type:       'object',
        properties: {
          sessionId: { type: 'string', description: 'The session UUID' },
        },
        required: ['sessionId'],
      },
    },
  },

  // ── Conflict analysis ──────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name:        'analyze_conflict',
      description: 'Detect cuisine, budget, or dietary conflicts between group members. Returns conflict type and which members are affected.',
      parameters: {
        type:       'object',
        properties: {
          sessionId: { type: 'string', description: 'The session UUID to analyse' },
        },
        required: ['sessionId'],
      },
    },
  },

  // ── Restaurant search ──────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name:        'search_restaurants',
      description: 'Search and filter the restaurant pool for this session\'s city. Optionally filter by cuisine type, vegetarian-only, or price cap.',
      parameters: {
        type:       'object',
        properties: {
          sessionId:  { type: 'string',  description: 'Used to look up the session city' },
          cuisines:   { type: 'array',  items: { type: 'string' }, description: 'Optional cuisine filters' },
          vegOnly:    { type: 'boolean', description: 'Set true to return only veg-friendly restaurants' },
          maxPrice:   { type: 'number',  description: 'Maximum price per person in INR' },
        },
        required: ['sessionId'],
      },
    },
  },

  // ── TOPSIS ranking ─────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name:        'rank_restaurants',
      description: 'Score and rank a list of restaurants using the TOPSIS fairness algorithm against this session\'s member preferences. Returns ranked list with scores.',
      parameters: {
        type:       'object',
        properties: {
          sessionId:     { type: 'string', description: 'The session UUID (used to fetch preferences)' },
          restaurantIds: {
            type:  'array',
            items: { type: 'number' },
            description: 'IDs of restaurants to rank (from search_restaurants result)',
          },
        },
        required: ['sessionId', 'restaurantIds'],
      },
    },
  },

  // ── Conflict resolution message ────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name:        'generate_conflict_resolution',
      description: 'When the group has conflicting preferences, generate a friendly negotiation message explaining the conflict and a compromise suggestion.',
      parameters: {
        type:       'object',
        properties: {
          sessionId: { type: 'string', description: 'The session UUID' },
        },
        required: ['sessionId'],
      },
    },
  },
];

module.exports = { TOOLS };

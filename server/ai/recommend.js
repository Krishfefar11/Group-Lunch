/**
 * recommend.js — Group restaurant recommendation engine
 *
 * Primary:  Groq LLM (llama-3.3-70b) — reads all member preferences and
 *           restaurant options, picks the 3 best fits with human reasoning.
 *
 * Fallback: TOPSIS + Nash Bargaining algorithm (runs when LLM call fails).
 *
 * Algorithm details (fallback only):
 *  1. Nash score (geometric mean of member satisfactions):
 *     If ANY member gets satisfaction = 0, the Nash score = 0.
 *  2. Egalitarian score (minimum satisfaction — Rawlsian fairness).
 *  3. Utilitarian score (average satisfaction).
 *  4. TOPSIS: relative closeness to ideal solution across all criteria.
 *  5. Conflict-aware diversity: top 3 picks spread across cuisine camps.
 */

const Groq = require('groq-sdk');

// ── Criteria weights (must sum to 1.0) ───────────────────────────────────────
const W = {
  nash:          0.28,   // fair compromise — geometric mean of satisfactions
  utilitarian:   0.22,   // total group happiness — arithmetic mean
  egalitarian:   0.20,   // no one left behind — minimum satisfaction
  rating:        0.18,   // restaurant quality signal
  deliverySpeed: 0.07,   // faster is better
  priceValue:    0.05,   // rating per ₹100 spent
};

const BUDGET_MAX = { under200: 200, '200to400': 400, any: 9999 };

// ── Step 1: Per-member satisfaction score for one (member, restaurant) pair ──
// Returns a value in [0, 1].
function memberSatisfaction(pref, restaurant) {
  const memberCuisines = pref.cuisine || [];
  const restCuisines   = restaurant.cuisines || [];

  // ── Cuisine score ─────────────────────────────────────────────────────────
  let cuisineScore;
  if (memberCuisines.includes('Any')) {
    // "Anything goes" — still slightly below an exact match so direct matches
    // rank higher when both options are available
    cuisineScore = 0.75;
  } else if (memberCuisines.some((c) => restCuisines.includes(c))) {
    cuisineScore = 1.0;   // exact cuisine match
  } else {
    cuisineScore = 0.10;  // no match — not 0 so we never hard-zero someone out
  }

  // ── Budget score ──────────────────────────────────────────────────────────
  const budgetMax = BUDGET_MAX[pref.budget] || 9999;
  let budgetScore;
  if (restaurant.pricePerPerson <= budgetMax) {
    budgetScore = 1.0;
  } else if (restaurant.pricePerPerson <= budgetMax * 1.25) {
    budgetScore = 0.5;   // slightly over budget — acceptable compromise
  } else {
    budgetScore = 0.0;   // clearly out of range
  }

  // Cuisine weighted more heavily than budget (people care more about food type)
  return 0.65 * cuisineScore + 0.35 * budgetScore;
}

// ── Step 2: Build the full criteria matrix for all restaurants ───────────────
function buildCriteriaMatrix(restaurants, preferences) {
  return restaurants.map((restaurant) => {
    const n = preferences.length;
    const memberScores = preferences.map((p) => memberSatisfaction(p, restaurant));

    // Utilitarian: simple average — total happiness
    const utilitarian = memberScores.reduce((s, x) => s + x, 0) / n;

    // Egalitarian: minimum score — the worst-off member (Rawlsian fairness)
    const egalitarian = Math.min(...memberScores);

    // Nash Bargaining: geometric mean — if anyone scores 0, result is 0
    // Use small epsilon to avoid log(0) but still heavily penalise near-zeros
    const nashProd = memberScores.reduce((prod, x) => prod * Math.max(x, 0.001), 1);
    const nash     = Math.pow(nashProd, 1 / n);

    // Restaurant quality metrics
    const rating       = parseFloat(restaurant.rating || 0) / 5.0;
    // Normalise delivery time: 10 min = 1.0, 60 min = 0.0 (linear)
    const deliverySpeed = Math.max(0, 1 - (restaurant.deliveryTimeMin - 10) / 50);
    // Price-value: more rating per ₹100 = better
    const priceValue   = parseFloat(restaurant.rating || 0) / ((restaurant.pricePerPerson || 200) / 100);

    return {
      restaurant,
      memberScores,
      criteria: { nash, utilitarian, egalitarian, rating, deliverySpeed, priceValue },
    };
  });
}

// ── Step 3: TOPSIS ───────────────────────────────────────────────────────────
// Ranks alternatives by their relative closeness to the ideal solution.
function topsis(matrix) {
  if (matrix.length === 0) return [];
  if (matrix.length === 1) return [{ ...matrix[0], topsisScore: 1.0 }];

  const keys = Object.keys(W);

  // 3a. Min-max normalise each criterion across all restaurants
  const mins = {}, maxs = {};
  for (const k of keys) {
    const vals = matrix.map((r) => r.criteria[k]);
    mins[k] = Math.min(...vals);
    maxs[k] = Math.max(...vals);
  }

  // 3b. Compute weighted normalised values
  const weighted = matrix.map((row) => {
    const wn = {};
    for (const k of keys) {
      const range = maxs[k] - mins[k];
      // If all restaurants are identical on this criterion → 0.5 (no discrimination)
      const norm = range === 0 ? 0.5 : (row.criteria[k] - mins[k]) / range;
      wn[k] = norm * W[k];
    }
    return { ...row, weighted: wn };
  });

  // 3c. Ideal best (A+) and ideal worst (A-) for each criterion
  const best = {}, worst = {};
  for (const k of keys) {
    const vals = weighted.map((r) => r.weighted[k]);
    best[k]  = Math.max(...vals);
    worst[k] = Math.min(...vals);
  }

  // 3d. Euclidean distance from ideal best and worst, then relative closeness
  return weighted
    .map((row) => {
      let dBest = 0, dWorst = 0;
      for (const k of keys) {
        dBest  += (row.weighted[k] - best[k])  ** 2;
        dWorst += (row.weighted[k] - worst[k]) ** 2;
      }
      dBest  = Math.sqrt(dBest);
      dWorst = Math.sqrt(dWorst);

      // Relative closeness: 1 = perfectly ideal, 0 = perfectly anti-ideal
      const topsisScore = (dBest + dWorst) === 0 ? 0 : dWorst / (dBest + dWorst);
      return { ...row, topsisScore };
    })
    .sort((a, b) => b.topsisScore - a.topsisScore);
}

// ── Step 4: Detect cuisine conflicts ─────────────────────────────────────────
function detectConflict(preferences) {
  const cuisineMap = new Map();   // cuisine → [memberNames]
  for (const p of preferences) {
    for (const c of (p.cuisine || []).filter((x) => x !== 'Any')) {
      if (!cuisineMap.has(c)) cuisineMap.set(c, []);
      cuisineMap.get(c).push(p.memberName);
    }
  }

  const total            = preferences.length;
  const allCuisines      = [...cuisineMap.keys()];
  const universalCuisines = allCuisines.filter((c) => cuisineMap.get(c).length === total);

  return {
    hasConflict: universalCuisines.length === 0 && allCuisines.length > 1,
    cuisineMap,                   // cuisine → [who wants it]
    universalCuisines,
  };
}

// ── Step 5: Enforce diversity when group has conflicting preferences ──────────
// Ensures the top 3 don't all serve the same cuisine when members disagree.
function enforceDiversity(ranked, preferences, n = 3) {
  const { hasConflict, cuisineMap } = detectConflict(preferences);
  if (!hasConflict || ranked.length <= n) return ranked.slice(0, n);

  // Order cuisine camps by member count (largest camp first)
  const campsBySizeDesc = [...cuisineMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cuisine]) => cuisine);

  const selected   = [];
  const usedIds    = new Set();

  // Pick the highest-TOPSIS restaurant for each cuisine camp
  for (const targetCuisine of campsBySizeDesc) {
    if (selected.length >= n) break;
    const pick = ranked.find(
      (r) => !usedIds.has(r.restaurant.id) &&
             (r.restaurant.cuisines || []).includes(targetCuisine)
    );
    if (pick) {
      selected.push(pick);
      usedIds.add(pick.restaurant.id);
    }
  }

  // Fill remaining slots with the best not yet chosen
  for (const r of ranked) {
    if (selected.length >= n) break;
    if (!usedIds.has(r.restaurant.id)) {
      selected.push(r);
      usedIds.add(r.restaurant.id);
    }
  }

  return selected.slice(0, n);
}

// ── Step 6: Generate a specific, human-readable reason ───────────────────────
function buildReason(row, preferences) {
  const { memberScores, restaurant, criteria } = row;

  const satisfied  = preferences.filter((_, i) => memberScores[i] >= 0.65).map((p) => p.memberName);
  const partial    = preferences.filter((_, i) => memberScores[i] >= 0.30 && memberScores[i] < 0.65).map((p) => p.memberName);
  const missed     = preferences.filter((_, i) => memberScores[i] < 0.30).map((p) => p.memberName);
  const n          = preferences.length;

  const parts = [];

  if (satisfied.length === n) {
    parts.push(`Everyone's top pick`);
  } else if (satisfied.length > 0 && missed.length > 0) {
    const satStr  = satisfied.length <= 2 ? satisfied.join(' & ') : `${satisfied.length} members`;
    const missStr = missed.length    <= 2 ? missed.join(' & ')    : `${missed.length} members`;
    parts.push(`${satStr} love this · fair compromise for ${missStr}`);
  } else if (satisfied.length > 0) {
    parts.push(`${satisfied.join(' & ')} preferred this`);
    if (partial.length > 0) parts.push(`${partial.join(' & ')} okay with it`);
  } else {
    parts.push('Best overall compromise for the group');
  }

  if (restaurant.rating >= 4.3)        parts.push(`rated ⭐${restaurant.rating}`);
  if (restaurant.deliveryTimeMin <= 25) parts.push(`${restaurant.deliveryTimeMin} min delivery`);

  return parts.slice(0, 2).join(' · ');
}

const log = require('../utils/logger');

// ── LLM recommendation ────────────────────────────────────────────────────────
/**
 * Ask Groq LLM to pick the 3 best restaurants for this specific group.
 * Sends all member preferences + all candidate restaurants in a structured
 * prompt and parses back a ranked JSON array.
 *
 * Caps the candidate list at 20 to keep the prompt within token limits.
 * Returns results in the same shape as the TOPSIS fallback so the caller
 * doesn't need to distinguish between sources.
 */
async function recommendWithLLM(preferences, restaurants) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  // ── 1. Build a balanced candidate list (max 20) ─────────────────────────────
  // Guarantee at least MIN_PER_CAMP restaurants per cuisine camp so the LLM
  // always has options for EVERY member, even when one cuisine is a minority.
  const allCuisines = [...new Set(preferences.flatMap((p) => p.cuisine || []).filter((c) => c !== 'Any'))];

  // Overall sort: cuisine-match count DESC, then rating DESC (fast relevance filter)
  const sorted = [...restaurants].sort((a, b) => {
    const aMatch = (a.cuisines || []).filter((c) => allCuisines.includes(c)).length;
    const bMatch = (b.cuisines || []).filter((c) => allCuisines.includes(c)).length;
    if (bMatch !== aMatch) return bMatch - aMatch;
    return parseFloat(b.rating || 0) - parseFloat(a.rating || 0);
  });

  const MIN_PER_CAMP = 3;
  const MAX_TOTAL    = 20;
  const candidateIds = new Set();
  const candidateList = [];

  // Step A: guarantee MIN_PER_CAMP per cuisine camp (respects veg/jain already
  // filtered in pool before this function is called)
  for (const cuisine of allCuisines) {
    const campRest = restaurants
      .filter((r) => (r.cuisines || []).includes(cuisine))
      .sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    for (const r of campRest.slice(0, MIN_PER_CAMP)) {
      if (!candidateIds.has(r.id)) {
        candidateList.push(r);
        candidateIds.add(r.id);
      }
    }
  }

  // Step B: fill remaining slots from the relevance-sorted list
  for (const r of sorted) {
    if (candidateList.length >= MAX_TOTAL) break;
    if (!candidateIds.has(r.id)) {
      candidateList.push(r);
      candidateIds.add(r.id);
    }
  }

  const candidates = candidateList;

  // ── 2. Detect cuisine conflicts ──────────────────────────────────────────────
  const { hasConflict, cuisineMap } = detectConflict(preferences);

  let conflictBlock = '';
  if (hasConflict) {
    const campLines = [...cuisineMap.entries()]
      .map(([c, members]) => `    • ${c} — wanted by: ${members.join(', ')}`)
      .join('\n');
    conflictBlock =
`\n⚠️  CUISINE CONFLICT — group members want DIFFERENT cuisines:
${campLines}
RULE: Your 3 picks MUST include at least one restaurant from EACH cuisine camp listed above.
      Do NOT return all 3 restaurants from the same cuisine. Each cuisine camp needs representation.\n`;
  }

  // Build a compact text block for each member
  const memberLines = preferences.map((p, i) => {
    const cuisines = (p.cuisine || []).join(', ') || 'Any';
    const diet     = (p.diet    || []).join(', ') || 'none';
    const budget   = p.budget   || 'any';
    return `  ${i + 1}. ${p.memberName}: cuisines=[${cuisines}], diet=[${diet}], budget=${budget}`;
  }).join('\n');

  // Build a compact numbered list of restaurants
  const restaurantLines = candidates.map((r, i) => {
    const cuisines = (r.cuisines || []).join('/');
    const veg      = r.vegFriendly  ? 'veg-ok'  : 'non-veg';
    const jain     = r.jainFriendly ? 'jain-ok' : '';
    const flags    = [veg, jain].filter(Boolean).join(', ');
    return `  ${i + 1}. "${r.name}" | ${cuisines} | ⭐${r.rating} | ₹${r.pricePerPerson}/person | ${r.deliveryTimeMin}min | ${flags}`;
  }).join('\n');

  const prompt = `You are a group lunch coordinator helping a team order food together.

GROUP (${preferences.length} member${preferences.length !== 1 ? 's' : ''}):
${memberLines}
${conflictBlock}
AVAILABLE RESTAURANTS (${candidates.length}):
${restaurantLines}

TASK: Pick the 3 best restaurants for this group. Your priorities in order:
1. Dietary restrictions — if any member is veg or jain, only pick veg/jain-ok restaurants (non-negotiable)
2. Cuisine diversity — when members have different cuisine preferences, spread picks across all cuisine camps (one per camp)
3. Cuisine preference — maximise how many members get a cuisine they like
4. Budget — prefer options within members' stated budgets
5. Fairness — avoid leaving anyone completely unhappy
6. Quality — prefer higher-rated restaurants

Reply ONLY with a valid JSON array of exactly 3 objects (no markdown, no prose):
[
  {
    "restaurantName": "exact name from the list above",
    "score": 85,
    "reason": "1-2 sentences — mention specific member names or preferences to show this is personalised",
    "matchCount": 4
  }
]

score: integer 60-100 — how well this restaurant fits the whole group
reason: personalised explanation (name actual members and preferences, don't be generic)
matchCount: how many of the ${preferences.length} members are genuinely happy (integer)`;

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens:  700,
  });

  const raw   = completion.choices[0]?.message?.content?.trim() || '[]';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Extract balanced JSON array
  const start = clean.indexOf('[');
  if (start === -1) throw new Error('LLM: no JSON array in response');
  let depth = 0, end = -1;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === '[') depth++;
    else if (clean[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const picks = JSON.parse(
    clean.slice(start, end + 1)
      .replace(/:\s*True\b/g,  ': true')
      .replace(/:\s*False\b/g, ': false')
  );

  if (!Array.isArray(picks) || !picks.length) throw new Error('LLM: empty picks array');

  // Match each LLM pick back to a real restaurant object
  const results = [];
  const usedIds = new Set();

  for (const pick of picks.slice(0, 3)) {
    const nameQuery = (pick.restaurantName || '').toLowerCase().trim();

    // 1. Exact match
    let restaurant = candidates.find((r) => r.name.toLowerCase() === nameQuery);
    // 2. Partial match (LLM sometimes truncates names)
    if (!restaurant) {
      restaurant = candidates.find((r) =>
        r.name.toLowerCase().includes(nameQuery) ||
        nameQuery.includes(r.name.toLowerCase())
      );
    }

    if (!restaurant || usedIds.has(restaurant.id)) continue;
    usedIds.add(restaurant.id);

    results.push({
      restaurant,
      score:      Math.min(100, Math.max(60, parseInt(pick.score) || 75)),
      reason:     pick.reason || 'Best match for the group',
      matchCount: Math.min(preferences.length, Math.max(0, parseInt(pick.matchCount) || 0)),
      _breakdown: { source: 'llm', model: 'llama-3.3-70b-versatile' },
    });
  }

  if (results.length === 0) throw new Error('LLM: could not match any picks to restaurant records');

  // ── 3. Post-processing diversity guard ───────────────────────────────────────
  // Even when the prompt explicitly asks for diversity the LLM occasionally
  // ignores it (especially for small groups with only 2 members).  Walk through
  // every cuisine camp; if a camp has zero representation in the 3 picks, swap
  // the lowest-priority pick (last in the array) for the best candidate that
  // covers the missing camp.
  if (hasConflict && results.length > 1) {
    for (const [targetCuisine, members] of cuisineMap.entries()) {
      // Is this cuisine already represented?
      const represented = results.some((r) =>
        (r.restaurant.cuisines || []).some((c) => c.toLowerCase() === targetCuisine.toLowerCase())
      );
      if (represented) continue;

      // Find best candidate for this missing camp that isn't already in results
      const pickedIds   = new Set(results.map((r) => r.restaurant.id));
      const replacement = candidates
        .filter((r) =>
          (r.cuisines || []).some((c) => c.toLowerCase() === targetCuisine.toLowerCase()) &&
          !pickedIds.has(r.id)
        )
        .sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0))[0];

      if (replacement) {
        const replaceIdx = results.length - 1; // swap out last (lowest priority) pick
        log.info(
          { targetCuisine, replaced: results[replaceIdx].restaurant.name, injected: replacement.name },
          'LLM diversity guard: injected missing cuisine camp'
        );
        results[replaceIdx] = {
          restaurant: replacement,
          score:      70,
          reason:     `Best ${targetCuisine} option — covers ${members.join(' & ')}'s preference`,
          matchCount: members.length,
          _breakdown: { source: 'llm', model: 'llama-3.3-70b-versatile' },
        };
      }
    }
  }

  return results;
}

// ── TOPSIS fallback (used when LLM call fails) ────────────────────────────────
function topsisRecommend(pool, preferences) {
  const matrix = buildCriteriaMatrix(pool, preferences);
  const ranked = topsis(matrix);
  const top3   = enforceDiversity(ranked, preferences, 3);
  const maxRaw = ranked[0]?.topsisScore || 1;

  return top3.map((row) => {
    const normalised   = row.topsisScore / maxRaw;
    const displayScore = Math.round(60 + normalised * 40);
    return {
      restaurant:  row.restaurant,
      score:       displayScore,
      reason:      buildReason(row, preferences),
      matchCount:  row.memberScores.filter((s) => s >= 0.65).length,
      _breakdown: {
        source:       'topsis',
        nash:         +(row.criteria.nash          * 100).toFixed(1),
        utilitarian:  +(row.criteria.utilitarian   * 100).toFixed(1),
        egalitarian:  +(row.criteria.egalitarian   * 100).toFixed(1),
        topsisScore:  +(row.topsisScore            * 100).toFixed(1),
      },
    };
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
async function recommend(preferences, restaurants) {
  if (!preferences.length || !restaurants.length) return [];

  // Hard dietary filter — these are non-negotiable
  const needsJain = preferences.some((p) => (p.diet || []).includes('jain'));
  const needsVeg  = preferences.some((p) => (p.diet || []).includes('veg'));

  let pool = restaurants.filter((r) => {
    if (needsJain && !r.jainFriendly) return false;
    if (needsVeg  && !r.vegFriendly)  return false;
    return true;
  });

  // Graceful fallback — relax only if truly no options available.
  // NEVER silently show non-veg restaurants to a veg user unless there are zero veg options.
  if (pool.length === 0 && needsJain) {
    // No jain restaurants — try veg-only as a compromise
    pool = restaurants.filter((r) => r.vegFriendly);
  }
  if (pool.length === 0 && needsVeg) {
    // No veg restaurants at all in DB — log a warning, use everything as last resort
    log.warn({ needsVeg, needsJain, total: restaurants.length }, 'No veg restaurants found — using full pool');
    pool = restaurants;
  }
  if (pool.length === 0) pool = restaurants; // absolute last resort

  // ── Primary: LLM recommendation ─────────────────────────────────────────
  try {
    const results = await recommendWithLLM(preferences, pool);
    if (results.length >= 1) {
      log.info({ count: results.length, source: 'llm' }, 'Recommendation complete');
      return results;
    }
  } catch (err) {
    log.warn({ err }, 'LLM recommendation failed — falling back to TOPSIS');
  }

  // ── Fallback: TOPSIS algorithm ───────────────────────────────────────────
  log.info({ source: 'topsis' }, 'Recommendation complete');
  return topsisRecommend(pool, preferences);
}

module.exports = { recommend };

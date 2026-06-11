/**
 * Unit tests — TOPSIS + Nash Bargaining + Cuisine Diversity algorithm
 *
 * Tests are deliberately data-driven: we construct small, hand-calculable
 * fixtures and assert *behavioural invariants* (e.g. "the restaurant that
 * satisfies everyone should rank #1") rather than fragile exact floats.
 */

const { _test } = require('../ai/recommend');
const {
  memberSatisfaction,
  buildCriteriaMatrix,
  topsis,
  detectConflict,
  enforceDiversity,
  topsisRecommend,
} = _test;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PREF_NI  = { memberName: 'Alice', cuisine: ['North Indian'], budget: '200to400' };
const PREF_SI  = { memberName: 'Bob',   cuisine: ['South Indian'], budget: '200to400' };
const PREF_ANY = { memberName: 'Carol', cuisine: ['Any'],          budget: 'any'      };
const PREF_CHN = { memberName: 'Dave',  cuisine: ['Chinese'],      budget: 'under200' };

const REST_NI = {
  id: 1, name: 'Punjabi Tadka', cuisines: ['North Indian'],
  rating: 4.5, deliveryTimeMin: 30, pricePerPerson: 300, vegFriendly: false,
};
const REST_SI = {
  id: 2, name: 'Saravana Bhavan', cuisines: ['South Indian'],
  rating: 4.3, deliveryTimeMin: 25, pricePerPerson: 200, vegFriendly: true,
};
const REST_MX = {
  id: 3, name: 'Spice Mix', cuisines: ['North Indian', 'South Indian'],
  rating: 4.1, deliveryTimeMin: 20, pricePerPerson: 250, vegFriendly: true,
};
const REST_CHN = {
  id: 4, name: 'China Garden', cuisines: ['Chinese'],
  rating: 4.0, deliveryTimeMin: 35, pricePerPerson: 180, vegFriendly: false,
};
const REST_EXP = {
  id: 5, name: 'Fancy Place', cuisines: ['North Indian'],
  rating: 4.8, deliveryTimeMin: 45, pricePerPerson: 800, vegFriendly: false,
};

// ─── memberSatisfaction ────────────────────────────────────────────────────────

describe('memberSatisfaction', () => {
  test('exact cuisine match + within budget → high score (≥ 0.65)', () => {
    const score = memberSatisfaction(PREF_NI, REST_NI);
    expect(score).toBeGreaterThanOrEqual(0.65);
  });

  test('cuisine mismatch → low score (< 0.5)', () => {
    const score = memberSatisfaction(PREF_NI, REST_SI);
    expect(score).toBeLessThan(0.5);
  });

  test('"Any" cuisine preference → moderate-high score (≥ 0.6)', () => {
    const score = memberSatisfaction(PREF_ANY, REST_NI);
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  test('"Any" cuisine always scores lower than an exact match', () => {
    const any   = memberSatisfaction(PREF_ANY,  REST_NI);
    const exact = memberSatisfaction(PREF_NI,   REST_NI);
    expect(exact).toBeGreaterThan(any);
  });

  test('way over budget → lowers score significantly', () => {
    // PREF_CHN budget is under200; REST_EXP pricePerPerson is 800 (4× over)
    const score = memberSatisfaction(PREF_CHN, REST_EXP);
    expect(score).toBeLessThan(0.5);
  });

  test('score is always in [0, 1]', () => {
    const pairs = [
      [PREF_NI,  REST_NI],  [PREF_NI,  REST_SI],
      [PREF_SI,  REST_MX],  [PREF_ANY, REST_CHN],
      [PREF_CHN, REST_EXP],
    ];
    pairs.forEach(([p, r]) => {
      const score = memberSatisfaction(p, r);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});

// ─── buildCriteriaMatrix ───────────────────────────────────────────────────────

describe('buildCriteriaMatrix', () => {
  test('returns one row per restaurant', () => {
    const matrix = buildCriteriaMatrix([REST_NI, REST_SI], [PREF_NI, PREF_SI]);
    expect(matrix).toHaveLength(2);
  });

  test('each row has restaurant, memberScores, and criteria fields', () => {
    const [row] = buildCriteriaMatrix([REST_NI], [PREF_NI]);
    expect(row).toHaveProperty('restaurant');
    expect(row).toHaveProperty('memberScores');
    expect(row).toHaveProperty('criteria');
    expect(row.criteria).toHaveProperty('nash');
    expect(row.criteria).toHaveProperty('utilitarian');
    expect(row.criteria).toHaveProperty('egalitarian');
    expect(row.criteria).toHaveProperty('rating');
    expect(row.criteria).toHaveProperty('deliverySpeed');
    expect(row.criteria).toHaveProperty('priceValue');
  });

  test('memberScores length equals number of preferences', () => {
    const prefs = [PREF_NI, PREF_SI, PREF_ANY];
    const [row] = buildCriteriaMatrix([REST_MX], prefs);
    expect(row.memberScores).toHaveLength(3);
  });

  test('egalitarian ≤ utilitarian (min never exceeds average)', () => {
    const rows = buildCriteriaMatrix([REST_NI, REST_SI, REST_MX], [PREF_NI, PREF_SI]);
    rows.forEach((row) => {
      expect(row.criteria.egalitarian).toBeLessThanOrEqual(row.criteria.utilitarian + 1e-9);
    });
  });

  test('nash ≤ utilitarian (geometric mean ≤ arithmetic mean)', () => {
    const rows = buildCriteriaMatrix([REST_NI, REST_SI, REST_MX], [PREF_NI, PREF_SI]);
    rows.forEach((row) => {
      expect(row.criteria.nash).toBeLessThanOrEqual(row.criteria.utilitarian + 1e-9);
    });
  });
});

// ─── topsis ───────────────────────────────────────────────────────────────────

describe('topsis', () => {
  test('empty input → empty output', () => {
    expect(topsis([])).toEqual([]);
  });

  test('single restaurant → topsisScore = 1.0', () => {
    const matrix = buildCriteriaMatrix([REST_NI], [PREF_NI]);
    const ranked = topsis(matrix);
    expect(ranked[0].topsisScore).toBeCloseTo(1.0);
  });

  test('returns all restaurants, sorted descending by topsisScore', () => {
    const matrix = buildCriteriaMatrix([REST_NI, REST_SI, REST_MX, REST_CHN], [PREF_NI, PREF_SI]);
    const ranked = topsis(matrix);
    expect(ranked).toHaveLength(4);
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].topsisScore).toBeGreaterThanOrEqual(ranked[i + 1].topsisScore);
    }
  });

  test('topsisScore is always in [0, 1]', () => {
    const matrix = buildCriteriaMatrix([REST_NI, REST_SI, REST_MX], [PREF_NI, PREF_SI, PREF_ANY]);
    topsis(matrix).forEach((row) => {
      expect(row.topsisScore).toBeGreaterThanOrEqual(0);
      expect(row.topsisScore).toBeLessThanOrEqual(1);
    });
  });

  test('restaurant satisfying everyone should rank above one that pleases no one', () => {
    // REST_MX serves both NI and SI — best for Alice + Bob
    // REST_CHN serves Chinese — satisfies nobody (Alice=NI, Bob=SI)
    const matrix = buildCriteriaMatrix([REST_MX, REST_CHN], [PREF_NI, PREF_SI]);
    const ranked = topsis(matrix);
    const mx  = ranked.find((r) => r.restaurant.id === REST_MX.id);
    const chn = ranked.find((r) => r.restaurant.id === REST_CHN.id);
    expect(mx.topsisScore).toBeGreaterThan(chn.topsisScore);
  });
});

// ─── detectConflict ───────────────────────────────────────────────────────────

describe('detectConflict', () => {
  test('all members want the same cuisine → no conflict', () => {
    const prefs = [
      { memberName: 'A', cuisine: ['North Indian'] },
      { memberName: 'B', cuisine: ['North Indian'] },
    ];
    expect(detectConflict(prefs).hasConflict).toBe(false);
  });

  test('members want different, non-overlapping cuisines → conflict', () => {
    const { hasConflict } = detectConflict([PREF_NI, PREF_SI]);
    expect(hasConflict).toBe(true);
  });

  test('"Any" preference does not count as a specific cuisine camp', () => {
    // One specific + one Any → no conflict (Any covers everyone)
    const prefs = [PREF_NI, PREF_ANY];
    const { hasConflict } = detectConflict(prefs);
    // Alice wants NI, Carol wants Any — only one cuisine camp (NI), so no conflict
    expect(hasConflict).toBe(false);
  });

  test('three different cuisines → conflict detected', () => {
    const { hasConflict } = detectConflict([PREF_NI, PREF_SI, PREF_CHN]);
    expect(hasConflict).toBe(true);
  });

  test('returns cuisineMap with correct member lists', () => {
    const { cuisineMap } = detectConflict([PREF_NI, PREF_SI, PREF_NI]);
    expect(cuisineMap.get('North Indian')).toHaveLength(2);
    expect(cuisineMap.get('South Indian')).toHaveLength(1);
  });

  test('universalCuisines contains cuisines all members want', () => {
    const prefs = [
      { memberName: 'A', cuisine: ['North Indian', 'South Indian'] },
      { memberName: 'B', cuisine: ['South Indian', 'Chinese'] },
    ];
    // Only 'South Indian' is wanted by both
    const { universalCuisines } = detectConflict(prefs);
    expect(universalCuisines).toContain('South Indian');
    expect(universalCuisines).not.toContain('North Indian');
    expect(universalCuisines).not.toContain('Chinese');
  });
});

// ─── enforceDiversity ─────────────────────────────────────────────────────────

describe('enforceDiversity', () => {
  const PREFS_CONFLICT = [PREF_NI, PREF_SI];   // Alice=NI, Bob=SI

  function rankAll(restaurants, prefs) {
    return topsis(buildCriteriaMatrix(restaurants, prefs));
  }

  test('when no conflict, returns top-n as-is', () => {
    const prefs = [PREF_NI, PREF_NI];  // both want NI — no conflict
    const ranked = rankAll([REST_NI, REST_MX, REST_CHN], prefs);
    const result = enforceDiversity(ranked, prefs, 2);
    expect(result).toHaveLength(2);
    // Should be the top-2 TOPSIS restaurants
    expect(result[0].topsisScore).toBeGreaterThanOrEqual(result[1].topsisScore);
  });

  test('with conflict, result includes a restaurant for each cuisine camp', () => {
    const ranked = rankAll([REST_NI, REST_SI, REST_MX, REST_CHN], PREFS_CONFLICT);
    const result = enforceDiversity(ranked, PREFS_CONFLICT, 3);
    expect(result.length).toBeGreaterThanOrEqual(2);

    const resultCuisines = result.flatMap((r) => r.restaurant.cuisines);
    // At least one NI pick for Alice
    const hasNI = resultCuisines.some((c) => c === 'North Indian');
    // At least one SI pick for Bob
    const hasSI = resultCuisines.some((c) => c === 'South Indian');
    expect(hasNI).toBe(true);
    expect(hasSI).toBe(true);
  });

  test('no duplicate restaurants in result', () => {
    const ranked = rankAll([REST_NI, REST_SI, REST_MX, REST_CHN], PREFS_CONFLICT);
    const result = enforceDiversity(ranked, PREFS_CONFLICT, 3);
    const ids = result.map((r) => r.restaurant.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('result length is at most n', () => {
    const ranked = rankAll([REST_NI, REST_SI, REST_MX, REST_CHN], PREFS_CONFLICT);
    const result = enforceDiversity(ranked, PREFS_CONFLICT, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

// ─── topsisRecommend (integration) ───────────────────────────────────────────

describe('topsisRecommend — integration', () => {
  test('returns an array with up to 3 items', () => {
    const prefs = [PREF_NI, PREF_SI];
    const pool  = [REST_NI, REST_SI, REST_MX, REST_CHN];
    const result = topsisRecommend(pool, prefs);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  test('each result has restaurant, score, reason, and _breakdown fields', () => {
    const result = topsisRecommend([REST_NI, REST_SI], [PREF_NI, PREF_SI]);
    result.forEach((r) => {
      expect(r).toHaveProperty('restaurant');
      expect(r).toHaveProperty('score');        // display score: 60–100
      expect(r).toHaveProperty('reason');
      expect(r).toHaveProperty('_breakdown.topsisScore'); // raw TOPSIS
      expect(typeof r.reason).toBe('string');
    });
  });

  test('handles single restaurant gracefully', () => {
    const result = topsisRecommend([REST_NI], [PREF_NI]);
    expect(result).toHaveLength(1);
    // Single restaurant → topsisScore normalises to 1.0 → displayScore = 100
    expect(result[0].score).toBe(100);
  });

  test('handles single member with no cuisine conflict', () => {
    const result = topsisRecommend([REST_NI, REST_SI, REST_MX], [PREF_NI]);
    // The NI restaurant or the mixed one should rank above SI-only
    expect(result.length).toBeGreaterThanOrEqual(1);
    const topRestaurant = result[0].restaurant;
    const servesNI = (topRestaurant.cuisines || []).includes('North Indian');
    expect(servesNI).toBe(true);
  });

  test('mixed-cuisine restaurant appears in conflict scenario', () => {
    // REST_MX serves both NI and SI — should appear when Alice+Bob conflict
    const result = topsisRecommend(
      [REST_NI, REST_SI, REST_MX, REST_CHN],
      [PREF_NI, PREF_SI]
    );
    const ids = result.map((r) => r.restaurant.id);
    // REST_MX (id=3) is the compromise option — it should be present
    expect(ids).toContain(REST_MX.id);
  });
});

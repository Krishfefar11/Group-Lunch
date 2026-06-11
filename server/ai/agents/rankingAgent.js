/**
 * rankingAgent.js — A5: Restaurant ranking specialist
 *
 * Combines TOPSIS algorithm (deterministic fairness scoring) with
 * LLM narrative reasoning. Returns results in a unified shape
 * regardless of which path produced them.
 */

const { recommend, topsisRecommend } = require('../recommend');
const log = require('../../utils/logger');

/**
 * Rank restaurants for a group using the primary LLM path with TOPSIS fallback.
 *
 * @param {object[]} preferences  — array of preference objects
 * @param {object[]} restaurants  — filtered restaurant pool from searchAgent
 * @returns {Promise<Array<{restaurant, score, reason, matchCount, _breakdown}>>}
 */
async function rankForGroup(preferences, restaurants) {
  if (!preferences.length || !restaurants.length) {
    return [];
  }

  try {
    const results = await recommend(preferences, restaurants);
    if (results.length >= 1) {
      log.info({ count: results.length, source: results[0]?._breakdown?.source || 'llm' }, 'rankingAgent: ranking complete');
      return results;
    }
  } catch (err) {
    log.warn({ err }, 'rankingAgent: primary rank failed — using TOPSIS fallback');
  }

  // TOPSIS-only fallback
  const fallback = topsisRecommend(restaurants, preferences);
  log.info({ count: fallback.length, source: 'topsis' }, 'rankingAgent: TOPSIS fallback used');
  return fallback;
}

module.exports = { rankForGroup };

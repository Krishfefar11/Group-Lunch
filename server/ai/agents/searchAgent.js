/**
 * searchAgent.js — A5: Restaurant search specialist
 *
 * Responsible for: fetching + filtering the restaurant pool.
 * Applies dietary hard-filters so no downstream agent needs to re-check them.
 */

const { Op }     = require('sequelize');
const { Restaurant } = require('../../models/index');
const { getRestaurantsForCity } = require('../../services/places');
const log = require('../../utils/logger');

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Return a filtered restaurant pool for a session's city.
 *
 * @param {string}   city       — delivery city
 * @param {object}   filters    — { cuisineHints, needsVeg, needsJain, maxPrice }
 * @returns {Promise<Restaurant[]>}
 */
async function findRestaurants(city, { cuisineHints = [], needsVeg = false, needsJain = false, maxPrice = null } = {}) {
  const cacheThreshold = new Date(Date.now() - CACHE_TTL_MS);

  // Check DB cache
  let restaurants = await Restaurant.findAll({
    where: { city, cachedAt: { [Op.gte]: cacheThreshold } },
  });

  // Cache miss — fetch from external API
  if (restaurants.length < 3) {
    log.info({ city, cuisineHints }, 'searchAgent: cache miss — fetching from places API');
    try {
      const fetched = await getRestaurantsForCity(city, cuisineHints);
      for (const r of fetched) {
        const [record] = await Restaurant.findOrCreate({ where: { placeId: r.placeId }, defaults: r });
        if (record.id) await record.update(r);
      }
      restaurants = await Restaurant.findAll({ where: { city } });
    } catch (err) {
      log.warn({ err }, 'searchAgent: places API failed — using cached data only');
    }
  }

  // Hard dietary filters
  let pool = [...restaurants];
  if (needsJain) pool = pool.filter((r) => r.jainFriendly);
  if (needsVeg)  pool = pool.filter((r) => r.vegFriendly);
  if (maxPrice)  pool = pool.filter((r) => r.pricePerPerson <= maxPrice);

  // Graceful degradation — relax jain filter if it leaves nothing
  if (pool.length === 0 && needsJain) {
    pool = restaurants.filter((r) => r.vegFriendly);
    log.warn({ city }, 'searchAgent: no jain restaurants — falling back to veg');
  }
  if (pool.length === 0) {
    pool = restaurants; // absolute fallback — use everything
  }

  log.info({ city, poolSize: pool.length }, 'searchAgent: pool ready');
  return pool;
}

module.exports = { findRestaurants };

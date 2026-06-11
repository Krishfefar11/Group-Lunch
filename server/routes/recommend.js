const express    = require('express');
const router     = express.Router();
const log        = require('../utils/logger');
const { Op }     = require('sequelize');
const { recommend }              = require('../ai/recommend');
const { getRestaurantsForCity }  = require('../services/places');
const { getDishesForRestaurant } = require('../services/mealdb');
const { Session, Preference, Restaurant, MenuItem } = require('../models/index');
const requireOrganizer = require('../middleware/requireOrganizer');

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── POST /api/sessions/:sessionId/recommend ───────────────────────────────────
// Fetch real restaurants for the session's city, score them with Groq, return top 3
router.post('/:sessionId/recommend', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [preferences, session] = await Promise.all([
      Preference.findAll({ where: { sessionUuid: sessionId } }),
      Session.findOne({ where: { sessionUuid: sessionId } }),
    ]);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (preferences.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No preferences submitted yet. Ask everyone to fill the form first.',
      });
    }

    const city = session.deliveryCity || 'Bangalore';

    // ── 1. Get cuisine hints from group preferences ──────────────────────────
    // Include ALL unique cuisines from all members — not just the first 2.
    // Slicing here was the root cause of biased restaurant pools.
    const cuisineHints = [
      ...new Set(
        preferences.flatMap((p) => p.cuisine || []).filter((c) => c !== 'Any')
      ),
    ];

    // ── 2. Check cache: do we have fresh restaurants for this city? ──────────
    const cacheThreshold = new Date(Date.now() - CACHE_TTL_MS);
    let restaurants = await Restaurant.findAll({
      where: {
        city,
        cachedAt: { [Op.gte]: cacheThreshold },
        source:   { [Op.ne]: 'static' },
      },
    });

    // ── 3. Cache miss → fetch from Foursquare / OpenStreetMap ────────────────
    if (restaurants.length < 3) {
      log.info({ city }, 'Fetching real restaurants');
      const fetched = await getRestaurantsForCity(city, cuisineHints);

      if (fetched.length > 0) {
        // Upsert by placeId — update if exists, create if new
        for (const r of fetched) {
          const [record] = await Restaurant.findOrCreate({
            where:    { placeId: r.placeId },
            defaults: r,
          });
          if (record.id && record.placeId) {
            await record.update({
              name:            r.name,
              cuisines:        r.cuisines,
              rating:          r.rating,
              deliveryTimeMin: r.deliveryTimeMin,
              vegFriendly:     r.vegFriendly,
              pricePerPerson:  r.pricePerPerson,
              imageEmoji:      r.imageEmoji,
              area:            r.area,
              address:         r.address,
              photoUrl:        r.photoUrl,
              source:          r.source,
              city:            r.city,
              cachedAt:        r.cachedAt,
            });
          }
        }

        // Re-fetch from DB after upsert
        restaurants = await Restaurant.findAll({
          where: {
            city,
            cachedAt: { [Op.gte]: cacheThreshold },
            source:   { [Op.ne]: 'static' },
          },
        });
      }
    }

    // ── 4. Fallback to static restaurants if real ones unavailable ────────────
    if (restaurants.length === 0) {
      log.warn('No real restaurants found — using static fallback');
      restaurants = await Restaurant.findAll();
    }

    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'No restaurants available for this city.' });
    }

    // ── 5. Rank with Groq AI ─────────────────────────────────────────────────
    const results = await recommend(preferences, restaurants);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "No restaurants match the group's filters." });
    }

    res.json({
      success: true,
      count:   results.length,
      city,
      source:  restaurants[0]?.source || 'static',
      preferences: preferences.length,
      data: results.map((r) => ({
        restaurant: {
          id:              r.restaurant.id,
          name:            r.restaurant.name,
          cuisines:        r.restaurant.cuisines,
          rating:          r.restaurant.rating,
          deliveryTimeMin: r.restaurant.deliveryTimeMin,
          pricePerPerson:  r.restaurant.pricePerPerson,
          vegFriendly:     r.restaurant.vegFriendly,
          jainFriendly:    r.restaurant.jainFriendly,
          imageEmoji:      r.restaurant.imageEmoji,
          area:            r.restaurant.area,
          address:         r.restaurant.address || '',
          photoUrl:        r.restaurant.photoUrl || null,
          source:          r.restaurant.source || 'static',
        },
        score:      r.score,
        reason:     r.reason,
        matchCount: r.matchCount,
        breakdown:  r._breakdown || null,
      })),
    });
  } catch (err) {
    log.error({ err }, 'Recommend route error');
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/sessions/:sessionId/restaurant ─────────────────────────────────
// Organizer locks in a restaurant, then we populate its menu from TheMealDB
router.patch('/:sessionId/restaurant', requireOrganizer, async (req, res) => {
  try {
    const { sessionId }   = req.params;
    const { restaurantId, orderUrl } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }

    const [session, restaurant] = await Promise.all([
      Session.findOne({ where: { sessionUuid: sessionId } }),
      Restaurant.findByPk(restaurantId),
    ]);

    if (!session)     return res.status(404).json({ success: false, message: 'Session not found' });
    if (!restaurant)  return res.status(404).json({ success: false, message: 'Restaurant not found' });

    // Validate orderUrl if provided — must be a Zomato or Swiggy URL
    const safeOrderUrl = orderUrl && /^https?:\/\/(www\.)?(zomato\.com|swiggy\.com)/i.test(orderUrl)
      ? orderUrl.trim()
      : null;

    // Update session status + optional direct order URL
    await session.update({ selectedRestaurantId: restaurantId, status: 'ordering', orderUrl: safeOrderUrl });

    // ── Populate real menu from TheMealDB (non-blocking — runs in background) ──
    const cuisines = restaurant.cuisines || ['Any'];
    populateMenuInBackground(restaurantId, cuisines, restaurant.name, req.io, sessionId);

    // Notify all members via socket
    if (req.io) {
      req.io.to(sessionId).emit('restaurant_selected', {
        restaurantId,
        restaurantName: restaurant.name,
      });
    }

    res.json({
      success: true,
      message: `${restaurant.name} selected! Everyone can now pick their items.`,
      data: { restaurantId, restaurantName: restaurant.name, status: 'ordering' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Background menu population ────────────────────────────────────────────────
// Runs after the PATCH response is sent so the user isn't waiting.
// Emits 'menu_ready' via socket when done so MenuView can fetch without polling.
async function populateMenuInBackground(restaurantId, cuisines, restaurantName = '', io = null, sessionId = null) {
  try {
    // Skip if menu is already populated — emit ready immediately so clients fetch
    const existing = await MenuItem.count({ where: { restaurantId } });
    if (existing > 0) {
      log.info({ restaurantId, existing }, 'Menu already populated — emitting ready');
      if (io && sessionId) io.to(sessionId).emit('menu_ready', { restaurantId });
      return;
    }

    const dishes = await getDishesForRestaurant(restaurantId, cuisines, restaurantName);
    if (!dishes.length) return;

    await MenuItem.bulkCreate(dishes);
    log.info({ restaurantId, restaurantName, count: dishes.length }, 'Menu populated');

    // Tell all clients in the session that the menu is ready to fetch
    if (io && sessionId) io.to(sessionId).emit('menu_ready', { restaurantId, count: dishes.length });
  } catch (err) {
    log.error({ err, restaurantId }, 'Menu population failed');
  }
}

module.exports = router;

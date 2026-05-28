const express    = require('express');
const router     = express.Router();
const { Op }     = require('sequelize');
const { recommend }              = require('../ai/recommend');
const { getRestaurantsForCity }  = require('../services/places');
const { getDishesForRestaurant } = require('../services/mealdb');
const { Session, Preference, Restaurant, MenuItem } = require('../models/index');

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
    const cuisineHints = [
      ...new Set(
        preferences.flatMap((p) => p.cuisine || []).filter((c) => c !== 'Any')
      ),
    ].slice(0, 2);

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
      console.log(`🔍 Fetching real restaurants for "${city}"...`);
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
      console.warn('⚠️  No real restaurants found — using static fallback');
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
      })),
    });
  } catch (err) {
    console.error('Recommend error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/sessions/:sessionId/restaurant ─────────────────────────────────
// Organizer locks in a restaurant, then we populate its menu from TheMealDB
router.patch('/:sessionId/restaurant', async (req, res) => {
  try {
    const { sessionId }   = req.params;
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }

    const [session, restaurant] = await Promise.all([
      Session.findOne({ where: { sessionUuid: sessionId } }),
      Restaurant.findByPk(restaurantId),
    ]);

    if (!session)     return res.status(404).json({ success: false, message: 'Session not found' });
    if (!restaurant)  return res.status(404).json({ success: false, message: 'Restaurant not found' });

    // Update session status
    await session.update({ selectedRestaurantId: restaurantId, status: 'ordering' });

    // ── Populate real menu from TheMealDB (non-blocking — runs in background) ──
    const cuisines = restaurant.cuisines || ['Any'];
    populateMenuInBackground(restaurantId, cuisines, restaurant.name);

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
// Runs after the PATCH response is sent so the user isn't waiting
async function populateMenuInBackground(restaurantId, cuisines, restaurantName = '') {
  try {
    // Skip if menu is already populated
    const existing = await MenuItem.count({ where: { restaurantId } });
    if (existing > 0) {
      console.log(`ℹ️  Menu already populated for restaurant #${restaurantId} (${existing} items)`);
      return;
    }

    const dishes = await getDishesForRestaurant(restaurantId, cuisines, restaurantName);
    if (!dishes.length) return;

    await MenuItem.bulkCreate(dishes);
    console.log(`✅ Populated ${dishes.length} dishes for "${restaurantName}" (#${restaurantId})`);
  } catch (err) {
    console.error('Menu population error:', err.message);
  }
}

module.exports = router;

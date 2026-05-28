const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');
const { Session, MenuItem, Preference, Order, OrderItem } = require('../models/index');

// ── GET /api/sessions/:sessionId/menu/suggestions?memberName=xxx ─────────────
// Returns AI-picked menu items personalised to this member.
// Uses their current preferences + past order history across all sessions.
router.get('/:sessionId/menu/suggestions', async (req, res) => {
  try {
    const { sessionId }  = req.params;
    const { memberName } = req.query;

    if (!memberName) {
      return res.status(400).json({ success: false, message: 'memberName is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: true, data: [] });
    }

    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session?.selectedRestaurantId) {
      return res.json({ success: true, data: [] });
    }

    // Fetch everything needed in parallel
    const [menuItems, preference, pastOrders] = await Promise.all([
      MenuItem.findAll({ where: { restaurantId: session.selectedRestaurantId } }),

      Preference.findOne({ where: { sessionUuid: sessionId, memberName } }),

      // Past order items: look up by member name across ALL sessions (cross-session memory)
      OrderItem.findAll({
        include: [{
          model:    Order,
          as:       'order',
          where:    { memberName },
          required: true,
          attributes: ['id', 'createdAt'],
        }],
        order:  [[{ model: Order, as: 'order' }, 'createdAt', 'DESC']],
        limit:  30,
      }),
    ]);

    if (menuItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Build compact representations for the prompt
    const menuContext = menuItems.map((m) => ({
      id:       m.id,
      name:     m.name,
      price:    m.price,
      veg:      m.veg,
      jain:     m.jainFriendly,
      tags:     m.tags || [],
      category: m.category,
    }));

    const pastFavorites = pastOrders
      .slice(0, 15)
      .map((oi) => `${oi.name} ₹${oi.price}`);

    const prefContext = preference
      ? { cuisine: preference.cuisine, diet: preference.diet, budget: preference.budget }
      : { cuisine: ['Any'], diet: ['none'], budget: 'any' };

    const budgetCap = { under200: 200, '200to400': 400, any: 9999 };
    const maxPrice  = budgetCap[prefContext.budget] || 9999;

    const systemPrompt = `You are personalising a menu for a group lunch app member.

MEMBER: ${memberName}
PREFERENCES: cuisine=${prefContext.cuisine?.join(',')} | diet=${prefContext.diet?.join(',')} | budget=₹${maxPrice}/person

PAST ORDERS (${pastFavorites.length} items, most recent first):
${pastFavorites.length > 0 ? pastFavorites.join('\n') : 'No history — first time ordering'}

CURRENT MENU (${menuItems.length} items):
${JSON.stringify(menuContext)}

TASK: Pick exactly 3 menu items to highlight for this member.

RULES:
- NEVER suggest non-veg items if diet contains "veg" or "jain"
- NEVER suggest jain=false items if diet contains "jain"
- NEVER suggest items above ₹${maxPrice}
- Prefer items matching their cuisine preference
- If they've ordered a similar item before, note it (isRepeat: true)
- Keep reasons under 8 words, friendly tone

Reply with ONLY valid JSON array, no markdown:
[{"id":<number>,"reason":"<string>","isRepeat":<bool>},...]`;

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: systemPrompt }],
      temperature: 0.2,
      max_tokens:  300,
    });

    const raw   = completion.choices[0]?.message?.content?.trim() || '[]';
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let aiPicks;
    try {
      aiPicks = JSON.parse(clean);
      if (!Array.isArray(aiPicks)) throw new Error('Not an array');
    } catch {
      return res.json({ success: true, data: [] });
    }

    // Hydrate with full item data
    const results = aiPicks.slice(0, 4).map((pick) => {
      const item = menuItems.find((m) => m.id === pick.id);
      if (!item) return null;
      return {
        id:       item.id,
        itemCode: item.itemCode,
        name:     item.name,
        price:    item.price,
        veg:      item.veg,
        category: item.category,
        tags:     item.tags || [],
        reason:   pick.reason || 'Recommended for you',
        isRepeat: pick.isRepeat || false,
      };
    }).filter(Boolean);

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Suggestions error:', err.message);
    res.json({ success: true, data: [] }); // fail gracefully, never break the menu
  }
});

module.exports = router;

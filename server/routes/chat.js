const express = require('express');
const router  = require('express').Router();
const Groq    = require('groq-sdk');
const { Restaurant, Preference, Session } = require('../models/index');
const { safeParse } = require('../ai/schemas');
const { z }         = require('zod');

// ── POST /api/sessions/:sessionId/chat ────────────────────────────────────────
router.post('/:sessionId/chat', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ success: false, message: 'AI chat not configured' });
    }

    // Fetch session context in parallel
    const [restaurants, preferences, session] = await Promise.all([
      Restaurant.findAll(),
      Preference.findAll({ where: { sessionUuid: sessionId } }),
      Session.findOne({ where: { sessionUuid: sessionId } }),
    ]);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const restaurantContext = restaurants.map((r) => ({
      id:              r.id,
      name:            r.name,
      cuisines:        r.cuisines,
      rating:          parseFloat(r.rating),
      deliveryTimeMin: r.deliveryTimeMin,
      pricePerPerson:  r.pricePerPerson,
      vegFriendly:     r.vegFriendly,
      jainFriendly:    r.jainFriendly,
    }));

    const prefLines = preferences.length > 0
      ? preferences.map((p) =>
          `${p.memberName}: cuisine=[${(p.cuisine || []).join(',')}] diet=[${(p.diet || []).join(',')}] budget=${p.budget}`
        ).join('\n')
      : 'None yet';

    const systemPrompt = `You are a friendly AI assistant for "Group Lunch" — a group food ordering app. Help users with:
1. Setting their food preferences from natural language
2. Answering questions about available restaurants
3. Guiding them through the ordering flow

RESTAURANTS:
${JSON.stringify(restaurantContext)}

GROUP PREFERENCES SO FAR (${preferences.length} members):
${prefLines}

SESSION STATUS: ${session.status}

VALID PREFERENCE VALUES:
- cuisine (array, pick relevant): NorthIndian, SouthIndian, Biryani, Chinese, Pizza, Burgers, Wraps, Continental, Breakfast, Any
- diet (array): veg, jain, no-peanuts, no-spicy, none
- budget (one value): under200, 200to400, any

RULES:
- Keep replies short and friendly — max 2 sentences.
- If the user describes their diet, cuisine preference, or budget, extract it and include a FILL_PREFERENCES action.
- For "no spicy" add "no-spicy" to diet array. For "vegan/vegetarian" add "veg". For "jain" add "jain".
- When no clear dietary restriction is mentioned, use diet: ["none"].
- ALWAYS respond with valid JSON only, no markdown fences.

If setting preferences:
{"reply":"...", "action":{"type":"FILL_PREFERENCES","cuisine":[...],"diet":[...],"budget":"..."}}

For all other responses:
{"reply":"..."}`;

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      // Keep last 6 turns for context without blowing token budget
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const completion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    chatMessages,
      temperature: 0.35,
      max_tokens:  250,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';

    // ── Zod-validated parsing (replaces fragile regex approach) ──────────────
    const ChatResponseSchema = z.object({
      reply:  z.string().min(1),
      action: z.object({
        type:    z.string(),
        cuisine: z.array(z.string()).optional(),
        diet:    z.array(z.string()).optional(),
        budget:  z.string().optional(),
      }).optional().nullable(),
    });

    const { data: parsed } = safeParse(ChatResponseSchema, raw);

    const rawFallbackReply = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    res.json({
      success: true,
      reply:   (parsed && parsed.reply) ? parsed.reply : (rawFallbackReply || "I didn't quite get that — try rephrasing?"),
      action:  (parsed && parsed.action) ? parsed.action : null,
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ success: false, message: 'AI assistant is unavailable right now.' });
  }
});

module.exports = router;

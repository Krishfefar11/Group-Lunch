const express = require('express');
const router  = express.Router();
const { Preference, SessionMember, Session } = require('../models/index');

// ── POST /api/sessions/:sessionId/preferences ─────────────────────────────
// Member submits their food preferences
router.post('/:sessionId/preferences', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { memberId, memberName, cuisine, diet, budget } = req.body;

    if (!memberId || !memberName) {
      return res.status(400).json({ success: false, message: 'memberId and memberName are required' });
    }

    // Check session exists
    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Upsert preference (create or update if already submitted)
    const [preference, created] = await Preference.upsert({
      sessionUuid: sessionId,
      memberId,
      memberName,
      cuisine:  Array.isArray(cuisine)  ? cuisine  : [],
      diet:     Array.isArray(diet)     ? diet     : [],
      budget:   budget || 'any',
    }, { returning: true });

    // Mark member as having submitted preference
    await SessionMember.update(
      { hasSubmittedPreference: true },
      { where: { sessionUuid: sessionId, memberId } }
    );

    // Notify all clients in this session room
    if (req.io) {
      req.io.to(sessionId).emit('preference_submitted', { memberId, memberName });
    }

    res.status(201).json({
      success: true,
      message: `Preferences saved for ${memberName}`,
      data: preference,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/sessions/:sessionId/preferences ──────────────────────────────
// Get all preferences for a session (organizer view)
router.get('/:sessionId/preferences', async (req, res) => {
  try {
    const preferences = await Preference.findAll({
      where: { sessionUuid: req.params.sessionId },
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, count: preferences.length, data: preferences });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

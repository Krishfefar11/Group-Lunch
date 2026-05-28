const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Session, SessionMember } = require('../models/index');

// ── POST /api/sessions ────────────────────────────────────────────────────
// Create a new lunch session (called by organizer)
router.post('/', async (req, res) => {
  try {
    const { organizerName, deliveryCity } = req.body;
    if (!organizerName || !organizerName.trim()) {
      return res.status(400).json({ success: false, message: 'Organizer name is required' });
    }

    const sessionUuid = uuidv4();
    const organizerId = uuidv4();

    // Create the session
    const session = await Session.create({
      sessionUuid,
      organizerId,
      organizerName:  organizerName.trim(),
      deliveryCity:   deliveryCity?.trim() || null,
      status:         'collecting',
    });

    // Add organizer as the first member
    await SessionMember.create({
      sessionUuid,
      memberId: organizerId,
      memberName: organizerName.trim(),
      hasSubmittedPreference: false,
      hasConfirmedOrder: false,
    });

    res.status(201).json({
      success: true,
      message: 'Session created',
      data: {
        sessionId: sessionUuid,
        organizerId,
        organizerName: organizerName.trim(),
        sessionUrl: `${process.env.CLIENT_URL}/session/${sessionUuid}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/sessions/:sessionId ──────────────────────────────────────────
// Fetch session data + all members
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { sessionUuid: req.params.sessionId },
      include: [{ model: SessionMember, as: 'members' }],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/sessions/:sessionId/join ────────────────────────────────────
// A teammate joins the session by entering their name
router.post('/:sessionId/join', async (req, res) => {
  try {
    const { memberName, memberId } = req.body;

    if (!memberName || !memberName.trim()) {
      return res.status(400).json({ success: false, message: 'Member name is required' });
    }

    const session = await Session.findOne({ where: { sessionUuid: req.params.sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // If memberId sent, check if already a member (page refresh case)
    if (memberId) {
      const existing = await SessionMember.findOne({
        where: { sessionUuid: req.params.sessionId, memberId },
      });
      if (existing) {
        return res.json({ success: true, message: 'Already a member', data: { memberId, memberName: existing.memberName, alreadyJoined: true } });
      }
    }

    const newMemberId = uuidv4();
    await SessionMember.create({
      sessionUuid: req.params.sessionId,
      memberId: newMemberId,
      memberName: memberName.trim(),
    });

    // Notify all clients in this session room (Stage 10 socket)
    if (req.io) {
      req.io.to(req.params.sessionId).emit('member_joined', {
        memberId: newMemberId,
        memberName: memberName.trim(),
      });
    }

    res.status(201).json({
      success: true,
      message: `${memberName.trim()} joined the session`,
      data: { memberId: newMemberId, memberName: memberName.trim(), alreadyJoined: false },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

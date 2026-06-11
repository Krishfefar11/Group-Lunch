const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Session, SessionMember, Restaurant } = require('../models/index');
const { createLimiter, joinLimiter } = require('../middleware/rateLimiter');

// ── POST /api/sessions ────────────────────────────────────────────────────
// Create a new lunch session (called by organizer)
router.post('/', createLimiter, async (req, res) => {
  try {
    const { organizerName, deliveryCity, upiId } = req.body;
    if (!organizerName || !organizerName.trim()) {
      return res.status(400).json({ success: false, message: 'Organizer name is required' });
    }

    const sessionUuid = uuidv4();
    const organizerId = uuidv4();

    // Sessions expire after 24 hours — cron job cleans them up nightly
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create the session
    const session = await Session.create({
      sessionUuid,
      organizerId,
      organizerName:  organizerName.trim(),
      deliveryCity:   deliveryCity?.trim() || null,
      upiId:          upiId?.trim()        || null,
      status:         'collecting',
      expiresAt,
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
      include: [
        { model: SessionMember, as: 'members' },
        { model: Restaurant,    as: 'restaurant' },
      ],
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
router.post('/:sessionId/join', joinLimiter, async (req, res) => {
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

// ── POST /api/sessions/:sessionId/claim-organizer ─────────────────────────
// Any session member can claim organizer status.
// Useful when the original organizer leaves or is unreachable.
router.post('/:sessionId/claim-organizer', async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, message: 'memberId is required' });
    }

    const session = await Session.findOne({ where: { sessionUuid: req.params.sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (['order_placed', 'delivered'].includes(session.status)) {
      return res.status(400).json({ success: false, message: 'Session has already been finalised' });
    }

    // Verify the requester is actually a member of this session
    const member = await SessionMember.findOne({
      where: { sessionUuid: req.params.sessionId, memberId },
    });
    if (!member) {
      return res.status(403).json({ success: false, message: 'You are not a member of this session' });
    }

    // Hand over organizer role
    await session.update({ organizerId: memberId, organizerName: member.memberName });

    // Notify everyone in the room
    if (req.io) {
      req.io.to(req.params.sessionId).emit('organizer_changed', {
        newOrganizerId:   memberId,
        newOrganizerName: member.memberName,
      });
    }

    res.json({
      success: true,
      message: `${member.memberName} is now the organizer`,
      data: { organizerId: memberId, organizerName: member.memberName },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

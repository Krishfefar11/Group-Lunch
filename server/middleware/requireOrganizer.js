const { Session } = require('../models/index');

/**
 * requireOrganizer — verifies the request comes from the session's organizer.
 *
 * Expects the client to send `x-organizer-id` header (or `organizerId` in body).
 * This replaces the current client-only `isOrganizer` localStorage flag.
 *
 * Usage: router.patch('/restaurant', requireOrganizer, handler)
 */
async function requireOrganizer(req, res, next) {
  const sessionId  = req.params.sessionId;
  const organizerId =
    req.headers['x-organizer-id'] ||
    req.body?.organizerId         ||
    null;

  if (!organizerId) {
    return res.status(401).json({
      success: false,
      message: 'Organizer ID required. Only the session creator can perform this action.',
    });
  }

  try {
    const session = await Session.findOne({ where: { sessionUuid: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.organizerId !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the session organizer can perform this action.',
      });
    }
    req.session = session;   // attach for downstream use
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireOrganizer;

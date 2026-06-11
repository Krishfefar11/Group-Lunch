/**
 * Session Cleanup Service
 *
 * Runs a daily cron job that hard-deletes sessions whose `expires_at`
 * timestamp has passed.  Because Session → Orders → OrderItems is set
 * up with ON DELETE CASCADE, all child rows are removed automatically.
 *
 * Schedule: every day at 03:00 local server time.
 * Also runs once at server startup so stale data from a previous run is
 * cleaned up immediately.
 */

const cron = require('node-cron');
const { Op }     = require('sequelize');
const { Session } = require('../models/index');
const log         = require('../utils/logger');

async function deleteStaleSessions() {
  try {
    const deleted = await Session.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() },
        // Don't delete a session that is currently in flight — give placed
        // orders a bit more breathing room (another 24 h) so the group can
        // still look at their tracking page after delivery.
        status: {
          [Op.notIn]: ['order_placed', 'preparing', 'out_for_delivery'],
        },
      },
    });

    if (deleted > 0) {
      log.info({ deleted }, 'Session cleanup: removed expired sessions');
    }
  } catch (err) {
    log.error({ err }, 'Session cleanup failed');
  }
}

function startCleanupJob() {
  // Run immediately on startup to catch anything that expired while the
  // server was down
  deleteStaleSessions();

  // Then repeat daily at 03:00
  cron.schedule('0 3 * * *', deleteStaleSessions, {
    timezone: 'Asia/Kolkata',  // IST — adjust if needed
  });

  log.info('Session cleanup cron scheduled (daily 03:00 IST)');
}

module.exports = { startCleanupJob, deleteStaleSessions };

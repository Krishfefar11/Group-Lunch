const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/index');

// GET /api/health
router.get('/', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    message: 'Group Lunch API is running',
    database: `MySQL — ${dbStatus}`,
    timestamp: new Date().toISOString(),
    stage: 'Stage 2 — MySQL + Sequelize',
  });
});

module.exports = router;

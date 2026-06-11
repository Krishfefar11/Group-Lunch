const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// ── Generic API limiter — all routes ────────────────────────────────────────
// Disabled in dev (polling + multiple tabs would always trigger it)
// 200/min in production
const apiLimiter = isDev
  ? (req, res, next) => next()   // no-op in development
  : rateLimit({
      windowMs:        60 * 1000,
      max:             200,
      standardHeaders: true,
      legacyHeaders:   false,
      message:         { success: false, message: 'Too many requests — please slow down.' },
    });

// ── AI routes (Groq / Foursquare) — expensive, tighter cap ──────────────────
// Disabled in dev so rapid testing never gets blocked
const aiLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs:        60 * 1000,
      max:             15,
      standardHeaders: true,
      legacyHeaders:   false,
      message:         { success: false, message: 'Too many AI requests — wait a moment.' },
      keyGenerator:    (req) => ipKeyGenerator(req) + ':' + (req.params.sessionId || ''),
    });

// ── Chat limiter — per session, tighter ─────────────────────────────────────
const chatLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs:        60 * 1000,
      max:             20,
      standardHeaders: true,
      legacyHeaders:   false,
      message:         { success: false, message: 'Slow down — max 20 messages per minute.' },
      keyGenerator:    (req) => ipKeyGenerator(req) + ':chat:' + (req.params.sessionId || ''),
    });

// ── Session create limiter — prevent session spam ────────────────────────────
// 5 new sessions per IP per minute (max 1 every 12 s)
const createLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs:        60 * 1000,
      max:             5,
      standardHeaders: true,
      legacyHeaders:   false,
      message:         { success: false, message: 'Too many sessions created — wait a moment.' },
    });

// ── Session join limiter — prevent brute-force UUID guessing ─────────────────
// 10 join attempts per IP per minute
const joinLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs:        60 * 1000,
      max:             10,
      standardHeaders: true,
      legacyHeaders:   false,
      message:         { success: false, message: 'Too many join attempts — wait a moment.' },
    });

module.exports = { apiLimiter, aiLimiter, chatLimiter, createLimiter, joinLimiter };

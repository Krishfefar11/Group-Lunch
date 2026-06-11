require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { syncDB } = require('./models/index');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, aiLimiter, chatLimiter } = require('./middleware/rateLimiter');
const log = require('./utils/logger');

// ── Connect to MySQL + sync all tables ──────────────────────────────────────
syncDB();

// ── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ── Socket.io Setup (used from Stage 9 onward) ──────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible in routes via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  log.debug({ socketId: socket.id }, 'Socket connected');

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    log.debug({ socketId: socket.id, sessionId }, 'Socket joined session room');
  });

  socket.on('disconnect', () => {
    log.debug({ socketId: socket.id }, 'Socket disconnected');
  });
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// ── Request logger — method, path, status, duration on every API call ───────
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    log[level]({ method: req.method, url: req.originalUrl, status: res.statusCode, ms }, 'Request');
  });
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', require('./routes/health'));
app.use('/api/admin',  require('./routes/admin'));

app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/sessions',    require('./routes/sessions'));
app.use('/api/sessions',    require('./routes/preferences'));
app.use('/api/sessions',    aiLimiter,   require('./routes/recommend'));   // AI-heavy
app.use('/api/sessions',    chatLimiter, require('./routes/chat'));         // per-session chat
app.use('/api/sessions',    aiLimiter,   require('./routes/suggestions'));  // AI suggestions
app.use('/api/sessions',    require('./routes/orders'));
app.use('/api/sessions',    require('./routes/coupons'));
app.use('/api/sessions',    require('./routes/payment'));

// ── Root route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🍱 Group Lunch API — Welcome!' });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  log.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
  log.info({ url: `http://localhost:${PORT}/api/health` }, 'Health check');
});

module.exports = { app, io };

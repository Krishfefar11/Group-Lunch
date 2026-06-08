require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { syncDB } = require('./models/index');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, aiLimiter, chatLimiter } = require('./middleware/rateLimiter');

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
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Join a session room (used for live tracking in Stage 9-10)
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`📌 Socket ${socket.id} joined session: ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);   // blanket rate limit on all API routes

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
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, io };

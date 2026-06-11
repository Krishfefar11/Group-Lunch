require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const http        = require('http');
const { Server }  = require('socket.io');
const helmet      = require('helmet');
const compression = require('compression');
const { syncDB }  = require('./models/index');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, aiLimiter, chatLimiter } = require('./middleware/rateLimiter');
const { startCleanupJob } = require('./services/cleanup');
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

// ── In-memory presence map ────────────────────────────────────────────────────
// socketId → { sessionId, memberId, memberName }
// Cleared automatically on disconnect; survives reconnects via presence_join re-emit
const presence = new Map();

function broadcastPresence(sessionId) {
  const online = [...presence.values()]
    .filter((p) => p.sessionId === sessionId)
    .map((p) => ({ memberId: p.memberId, memberName: p.memberName }));
  io.to(sessionId).emit('presence_update', { sessionId, online });
}

io.on('connection', (socket) => {
  log.debug({ socketId: socket.id }, 'Socket connected');

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    log.debug({ socketId: socket.id, sessionId }, 'Socket joined session room');
  });

  // Presence: client emits this after join_session to register their identity
  socket.on('presence_join', ({ sessionId, memberId, memberName } = {}) => {
    if (!sessionId || !memberId) return;
    presence.set(socket.id, { sessionId, memberId, memberName: memberName || '?' });
    broadcastPresence(sessionId);
  });

  socket.on('disconnect', () => {
    log.debug({ socketId: socket.id }, 'Socket disconnected');
    const info = presence.get(socket.id);
    if (info) {
      presence.delete(socket.id);
      broadcastPresence(info.sessionId);
    }
  });
});

// ── Middleware ───────────────────────────────────────────────────────────────

// Gzip all responses — reduces payload by ~65% with zero code changes
app.use(compression());

// HTTPS redirect — in production behind a reverse proxy/load balancer
// Proxies set X-Forwarded-Proto: the original scheme before TLS termination
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security headers via helmet
// crossOriginEmbedderPolicy off — socket.io requires cross-origin connections
// contentSecurityPolicy off    — React uses inline styles throughout
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy:     false,
}));

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
app.use('/api/sessions',    require('./routes/agent'));    // A1–A8 agent endpoints

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
  startCleanupJob();
});

module.exports = { app, io };

/**
 * Express app wiring: security middleware, health check, API routers,
 * 404 handler, and the central error handler (mounted last).
 *
 * Router requires are wrapped in try/catch so the app can boot even before
 * every route file exists yet - a missing router just logs a warning
 * instead of crashing the whole server.
 */
'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');
const sanitizeRequest = require('./utils/sanitize');
const { ok, fail } = require('./utils/ApiResponse');
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const { isDbConnected } = require('./config/db');

const app = express();

app.use(helmet());

// CLIENT_ORIGIN may be a comma-separated list so the deployed site and any
// preview URLs are all allowed. A single "*" allows any origin (handy for a
// quick demo, but tighten it for real production).
const allowedOrigins = config.clientOrigin.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, health checks) send no Origin - allow them.
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (config.env !== 'production') app.use(morgan('dev'));
app.use(sanitizeRequest);

// Health check - never gated behind auth or rate limiting.
app.get('/api/health', (req, res) => {
  ok(res, {
    status: 'ok',
    db: isDbConnected() ? 'connected' : 'memory',
    uptime: process.uptime(),
  });
});

// Public status endpoint: which AI engine is active. Never exposes any key.
app.get('/api/status', (req, res) => {
  // eslint-disable-next-line global-require
  const aiService = require('./services/aiService');
  ok(res, aiService.providerStatus());
});

app.use('/api', apiLimiter);

/** Mount a router, tolerating the file not existing yet. */
function mountRoute(mountPath, routerPath) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const router = require(routerPath);
    app.use(mountPath, router);
  } catch (err) {
    logger.warn(`[app] Route "${mountPath}" not mounted (${err.message})`);
  }
}

mountRoute('/api/auth', './routes/authRoutes');
mountRoute('/api/projects', './routes/projectRoutes');
mountRoute('/api/mentor', './routes/mentorRoutes');
mountRoute('/api/generate', './routes/generateRoutes');
mountRoute('/api/explore', './routes/exploreRoutes');

// Unmatched API routes -> structured 404 (must come after real routers).
app.use('/api', (req, res) => {
  fail(res, 404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND');
});

app.use(errorHandler);

module.exports = app;

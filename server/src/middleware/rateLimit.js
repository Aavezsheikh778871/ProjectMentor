/**
 * Rate limiters. All are no-ops when DISABLE_RATE_LIMIT=true so a hackathon
 * demo can never get itself locked out.
 *
 * - apiLimiter:  generous, applied to all of /api
 * - authLimiter: tighter, applied to /api/auth (login/register)
 * - aiLimiter:   10 requests / 24h per authenticated user (falls back to IP),
 *                applied to the expensive generation endpoints
 */
'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');
const { fail } = require('../utils/ApiResponse');

// express-rate-limit v7+ exports ipKeyGenerator for safe IPv6 handling.
// Fall back to req.ip directly on older/newer versions that don't export it.
let ipKeyGenerator;
try {
  ({ ipKeyGenerator } = require('express-rate-limit'));
} catch {
  ipKeyGenerator = null;
}
const keyForIp = (req) => (ipKeyGenerator ? ipKeyGenerator(req.ip) : req.ip);

const noop = (req, res, next) => next();

function rateLimitHandler(req, res) {
  const resetMs = req.rateLimit?.resetTime ? req.rateLimit.resetTime - Date.now() : null;
  const resetMins = resetMs ? Math.ceil(resetMs / 60000) : null;
  return fail(
    res,
    429,
    resetMins
      ? `Too many requests. Try again in about ${resetMins} minute(s).`
      : 'Too many requests. Please try again later.',
    'RATE_LIMITED'
  );
}

function buildLimiter(options) {
  if (config.disableRateLimit) return noop;
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    ...options,
  });
}

const apiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  keyGenerator: keyForIp,
});

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: keyForIp,
});

const aiLimiter = buildLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${keyForIp(req)}`),
});

module.exports = { apiLimiter, authLimiter, aiLimiter };

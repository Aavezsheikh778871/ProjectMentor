/**
 * Central config loader. Every other server module reads settings from here
 * instead of touching `process.env` directly, so there is exactly one place
 * that understands defaults and fallback behaviour.
 */
'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';

// --- JWT secret -------------------------------------------------------
// Production must supply a real secret. Development gets a random one so
// the server still boots for a demo, with a loud warning that sessions
// will not survive a restart.
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (env === 'production') {
    throw new Error(
      'JWT_SECRET is required in production. Set it in your environment before starting the server.'
    );
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  // eslint-disable-next-line no-console
  console.warn(
    '[config] JWT_SECRET not set - generated a random development secret. ' +
      'Existing tokens will become invalid on restart. Set JWT_SECRET in server/.env to persist sessions.'
  );
}

const config = Object.freeze({
  env,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  aiProvider: (process.env.AI_PROVIDER || '').toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  disableRateLimit: String(process.env.DISABLE_RATE_LIMIT || '').toLowerCase() === 'true',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 86400,
});

module.exports = config;

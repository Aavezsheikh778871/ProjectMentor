/**
 * Minimal structured logger. Swap for pino/winston later without touching
 * call sites - they only use .info/.warn/.error/.debug.
 */
'use strict';

const ts = () => new Date().toISOString();

const logger = {
  info: (...args) => console.log(`[${ts()}] INFO`, ...args),
  warn: (...args) => console.warn(`[${ts()}] WARN`, ...args),
  error: (...args) => console.error(`[${ts()}] ERROR`, ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') console.debug(`[${ts()}] DEBUG`, ...args);
  },
};

module.exports = logger;

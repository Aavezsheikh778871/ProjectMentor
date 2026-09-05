/**
 * Process entry point: connect (or fall back) to the DB, start listening,
 * and fail loudly-but-gracefully on unexpected errors.
 */
'use strict';

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDB } = require('./config/db');
const { providerInfo } = (() => {
  try {
    return require('./services/providers');
  } catch {
    return { providerInfo: () => ({ provider: 'fallback', aiEnabled: false }) };
  }
})();

async function start() {
  const dbConnected = await connectDB();
  const info = providerInfo();

  const server = app.listen(config.port, () => {
    logger.info(`[server] ProjectMentor AI API listening on http://localhost:${config.port}`);
    logger.info(`[server] Database: ${dbConnected ? 'MongoDB connected' : 'memory-only mode'}`);
    logger.info(
      `[server] AI provider: ${info.provider} (${info.aiEnabled ? 'live' : 'offline fallback engine'})`
    );
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('[server] Unhandled promise rejection:', reason);
  });

  process.on('SIGTERM', () => {
    logger.info('[server] SIGTERM received, shutting down gracefully.');
    server.close(() => process.exit(0));
  });
}

start().catch((err) => {
  logger.error('[server] Fatal startup error:', err);
  process.exit(1);
});

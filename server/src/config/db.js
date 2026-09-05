/**
 * MongoDB connection with a demo-safe fallback: if MONGODB_URI is blank, or
 * the connection attempt fails, the app keeps running in memory-only mode
 * instead of crashing. Controllers check isDbConnected() to decide whether
 * to persist to Mongo or serve from the in-memory store.
 */
'use strict';

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

async function connectDB() {
  if (!config.mongoUri) {
    logger.warn('[db] MONGODB_URI not set - running in memory-only mode (no persistence).');
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    // Fail fast instead of buffering queries for 10s if the connection ever
    // drops - every call site branches on isDbConnected() first anyway.
    mongoose.set('bufferCommands', false);
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    logger.info(`[db] Connected to MongoDB at ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (err) {
    logger.warn(`[db] Failed to connect to MongoDB (${err.message}). Falling back to memory-only mode.`);
    return false;
  }
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbConnected };

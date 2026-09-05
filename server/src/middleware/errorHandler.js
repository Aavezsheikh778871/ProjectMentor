/**
 * Central error-handling middleware. Mounted last in app.js. Normalises
 * ApiError, Mongoose errors, and JWT errors into the standard error
 * envelope; anything unrecognised becomes a generic 500.
 */
'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL';
  let details;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err.name === 'ValidationError' && err.errors) {
    // Mongoose schema validation error
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid value for field "${err.path}"`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already in use`;
    details = err.keyValue;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid or expired session, please log in again';
  } else if (err.status) {
    status = err.status;
    message = err.message || message;
  }

  if (status >= 500) {
    logger.error(err);
  } else {
    logger.warn(`[${code}] ${message}`);
  }

  const payload = { success: false, error: { message, code, ...(details !== undefined ? { details } : {}) } };
  if (config.env !== 'production' && status >= 500) {
    payload.error.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;

/**
 * Wraps an async route/controller function so rejected promises are
 * forwarded to Express's error middleware instead of crashing the process
 * or hanging the request.
 */
'use strict';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

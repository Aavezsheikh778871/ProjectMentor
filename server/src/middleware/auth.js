/**
 * JWT auth middleware.
 *  - protect:        requires a valid Bearer token, attaches req.user
 *  - optionalAuth:   attaches req.user when a valid token is present,
 *                     never rejects the request otherwise
 */
'use strict';

const { verifyToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Please log in to continue', 'NO_TOKEN');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session, please log in again', 'INVALID_TOKEN');
  }

  // Goes through the repo (not the Mongoose model directly) so auth also
  // works when running in memory-only mode with no MONGODB_URI set.
  const userRepo = require('../repositories/userRepo');
  const user = await userRepo.findById(payload.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'USER_NOT_FOUND');

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const userRepo = require('../repositories/userRepo');
    const user = await userRepo.findById(payload.id);
    if (user) req.user = user;
  } catch {
    // Invalid token on an optional route just means "anonymous" - don't block.
  }
  return next();
});

module.exports = { protect, optionalAuth };

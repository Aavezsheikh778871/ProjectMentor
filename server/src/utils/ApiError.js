/**
 * Typed application error. Route/controller code throws these (or lets
 * asyncHandler catch them) and errorHandler.js maps them straight to an
 * HTTP response - no guessing status codes at the call site.
 */
'use strict';

class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details) {
    return new ApiError(401, message, code, details);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details) {
    return new ApiError(403, message, code, details);
  }

  static notFound(message = 'Not found', code = 'NOT_FOUND', details) {
    return new ApiError(404, message, code, details);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT', details) {
    return new ApiError(409, message, code, details);
  }

  static tooMany(message = 'Too many requests', code = 'RATE_LIMITED', details) {
    return new ApiError(429, message, code, details);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL', details) {
    return new ApiError(500, message, code, details);
  }
}

module.exports = ApiError;

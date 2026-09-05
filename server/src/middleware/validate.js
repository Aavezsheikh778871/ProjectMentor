/**
 * Zod-backed request validation. `validate(schema)` parses req.body (or
 * another source) and replaces it with the parsed/coerced result so
 * downstream handlers can trust the shape.
 */
'use strict';

const ApiError = require('../utils/ApiError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;

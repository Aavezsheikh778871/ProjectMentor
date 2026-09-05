/**
 * Defence-in-depth input sanitisation, applied globally in app.js:
 *  - strips <script> blocks and inline on*= handlers from string values
 *  - drops object keys starting with "$" or containing "." to block
 *    Mongo operator injection (e.g. { "$gt": "" })
 * Mutates req.body/query/params in place rather than reassigning them,
 * because req.query can be a read-only getter in modern Express.
 */
'use strict';

const SCRIPT_TAG = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const INLINE_HANDLER = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

function cleanString(value) {
  return value.replace(SCRIPT_TAG, '').replace(INLINE_HANDLER, '').trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeInPlace(target) {
  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i += 1) {
      const v = target[i];
      if (typeof v === 'string') target[i] = cleanString(v);
      else if (v && typeof v === 'object') sanitizeInPlace(v);
    }
    return target;
  }

  if (isPlainObject(target)) {
    for (const key of Object.keys(target)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete target[key];
        continue;
      }
      const v = target[key];
      if (typeof v === 'string') target[key] = cleanString(v);
      else if (v && typeof v === 'object') sanitizeInPlace(v);
    }
  }
  return target;
}

function sanitizeRequest(req, _res, next) {
  try {
    if (req.body) sanitizeInPlace(req.body);
  } catch {
    /* never block a request because sanitisation hiccuped */
  }
  try {
    if (req.query) sanitizeInPlace(req.query);
  } catch {
    /* req.query may be a getter-only object in some Express versions */
  }
  try {
    if (req.params) sanitizeInPlace(req.params);
  } catch {
    /* noop */
  }
  next();
}

module.exports = sanitizeRequest;

/**
 * Response envelope helpers. Every route handler replies through one of
 * these so the client always parses the same shape:
 *   success -> { success: true, data, message? }
 *   error   -> { success: false, error: { message, code, details? } }
 */
'use strict';

function ok(res, data = null, message) {
  return res.status(200).json({ success: true, data, ...(message ? { message } : {}) });
}

function created(res, data = null, message) {
  return res.status(201).json({ success: true, data, ...(message ? { message } : {}) });
}

function fail(res, status = 500, message = 'Something went wrong', code = 'ERROR', details) {
  return res.status(status).json({
    success: false,
    error: { message, code, ...(details !== undefined ? { details } : {}) },
  });
}

module.exports = { ok, created, fail };

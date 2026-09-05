'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const sanitize = require('../src/utils/sanitize');
const { signToken, verifyToken } = require('../src/utils/token');
const ApiError = require('../src/utils/ApiError');

function runSanitize(req) {
  return new Promise((resolve) => sanitize(req, {}, () => resolve(req)));
}

test('sanitize: strips <script> blocks from string fields', async () => {
  const req = { body: { bio: 'hi<script>alert(1)</script> there' }, query: {}, params: {} };
  await runSanitize(req);
  assert.ok(!req.body.bio.includes('<script>'));
});

test('sanitize: strips inline on*= event handlers', async () => {
  const req = { body: { html: '<img src=x onerror="steal()">' }, query: {}, params: {} };
  await runSanitize(req);
  assert.ok(!/onerror=/i.test(req.body.html));
});

test('sanitize: drops Mongo operator keys ($ and dotted)', async () => {
  const req = { body: { $where: 'evil', 'a.b': 1, safe: 'ok' }, query: {}, params: {} };
  await runSanitize(req);
  assert.ok(!('$where' in req.body));
  assert.ok(!('a.b' in req.body));
  assert.equal(req.body.safe, 'ok');
});

test('sanitize: recurses into nested objects and arrays', async () => {
  const req = { body: { nested: { $gt: '', items: ['<script>x</script>a'] } }, query: {}, params: {} };
  await runSanitize(req);
  assert.ok(!('$gt' in req.body.nested));
  assert.ok(!req.body.nested.items[0].includes('<script>'));
});

test('token: signs and verifies a JWT round-trip', () => {
  const token = signToken({ _id: 'abc123', email: 'x@y.com' });
  const payload = verifyToken(token);
  assert.equal(payload.id, 'abc123');
  assert.equal(payload.email, 'x@y.com');
});

test('token: a tampered token fails verification', () => {
  const token = signToken({ _id: 'abc', email: 'x@y.com' });
  assert.throws(() => verifyToken(token + 'tampered'));
});

test('ApiError: static helpers set the right status codes', () => {
  assert.equal(ApiError.badRequest().status, 400);
  assert.equal(ApiError.unauthorized().status, 401);
  assert.equal(ApiError.forbidden().status, 403);
  assert.equal(ApiError.notFound().status, 404);
  assert.equal(ApiError.tooMany().status, 429);
  assert.equal(ApiError.internal().status, 500);
});

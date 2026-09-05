'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const cache = require('../src/utils/cache');

test('cache: value round-trips through get/set', async () => {
  const key = cache.makeKey('t', { a: 1 });
  await cache.set(key, { hello: 'world' }, 60);
  assert.deepEqual(await cache.get(key), { hello: 'world' });
});

test('cache: makeKey is stable regardless of property order', () => {
  const k1 = cache.makeKey('ns', { a: 1, b: 2, c: [1, 2, 3] });
  const k2 = cache.makeKey('ns', { c: [1, 2, 3], b: 2, a: 1 });
  assert.equal(k1, k2);
});

test('cache: different payloads produce different keys', () => {
  assert.notEqual(cache.makeKey('ns', { a: 1 }), cache.makeKey('ns', { a: 2 }));
});

test('cache: namespace is part of the key', () => {
  assert.notEqual(cache.makeKey('a', { x: 1 }), cache.makeKey('b', { x: 1 }));
});

test('cache: expired entries are not returned', async () => {
  const key = cache.makeKey('ttl', { n: Math.random() });
  await cache.set(key, 'v', -1); // already expired
  assert.equal(await cache.get(key), null);
});

test('cache: del removes an entry', async () => {
  const key = cache.makeKey('del', { n: Math.random() });
  await cache.set(key, 'v', 60);
  await cache.del(key);
  assert.equal(await cache.get(key), null);
});

test('cache: missing key returns null', async () => {
  assert.equal(await cache.get('does-not-exist'), null);
});

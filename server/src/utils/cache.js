/**
 * In-memory TTL cache standing in for Redis. Same async surface a real
 * Redis client would have, so upgrading later means rewriting only this
 * file (get/set/del/makeKey) with an ioredis-backed implementation -
 * nothing else in the codebase changes.
 */
'use strict';

const MAX_ENTRIES = 500;
/** key -> { value, expiresAt } */
const store = new Map();

function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

// Periodic sweep so memory doesn't grow unbounded between reads.
// unref() so this timer never keeps the process alive on its own.
setInterval(evictExpired, 5 * 60 * 1000).unref?.();

async function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

async function set(key, value, ttlSeconds = 86400) {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    // Oldest-first eviction: Map preserves insertion order.
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function del(key) {
  store.delete(key);
}

/** FNV-1a over a stable (sorted-key) JSON string, so key order never matters. */
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function makeKey(namespace, payloadObject) {
  return `${namespace}:${fnv1aHash(stableStringify(payloadObject || {}))}`;
}

module.exports = { get, set, del, makeKey };

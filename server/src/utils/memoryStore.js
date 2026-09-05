/**
 * In-memory data store used when MONGODB_URI is not configured. Gives every
 * controller a Mongo-independent way to persist data for the lifetime of the
 * process, so the whole app (auth, saved projects, conversations) still
 * works end-to-end in a zero-config demo. Data does not survive a restart.
 */
'use strict';

let counter = 0;
const nextId = () => `mem_${Date.now().toString(36)}_${(++counter).toString(36)}`;

function createCollection() {
  /** @type {Map<string, object>} */
  const data = new Map();
  return {
    create(doc) {
      const _id = doc._id || nextId();
      const now = new Date();
      const record = { ...doc, _id, createdAt: doc.createdAt || now, updatedAt: now };
      data.set(_id, record);
      return record;
    },
    findById(id) {
      return data.get(String(id)) || null;
    },
    /** @param {(doc: object) => boolean} predicate */
    find(predicate = () => true) {
      return [...data.values()].filter(predicate);
    },
    updateById(id, updates) {
      const existing = data.get(String(id));
      if (!existing) return null;
      const updated = { ...existing, ...updates, _id: existing._id, updatedAt: new Date() };
      data.set(String(id), updated);
      return updated;
    },
    deleteById(id) {
      return data.delete(String(id));
    },
    all() {
      return [...data.values()];
    },
  };
}

module.exports = {
  users: createCollection(),
  projects: createCollection(),
  conversations: createCollection(),
  feedback: createCollection(),
  nextId,
};

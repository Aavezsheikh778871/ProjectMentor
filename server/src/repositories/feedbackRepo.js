/**
 * Feedback repository - Mongo when connected, in-memory store otherwise.
 * Enforces one rating per (user, project) pair in both backends.
 */
'use strict';

const { isDbConnected } = require('../config/db');
const Feedback = require('../models/Feedback');
const memory = require('../utils/memoryStore');

async function upsert(userId, projectIdeaId, { rating, comment = '', suggestions = [] }) {
  if (isDbConnected()) {
    return Feedback.findOneAndUpdate(
      { userId, projectIdeaId },
      { $set: { rating, comment, suggestions } },
      { new: true, upsert: true, runValidators: true }
    );
  }
  const existing = memory.feedback.find((f) => f.userId === String(userId) && f.projectIdeaId === String(projectIdeaId))[0];
  if (existing) return memory.feedback.updateById(existing._id, { rating, comment, suggestions });
  return memory.feedback.create({ userId: String(userId), projectIdeaId: String(projectIdeaId), rating, comment, suggestions });
}

async function existsFor(userId, projectIdeaId) {
  if (isDbConnected()) return Boolean(await Feedback.exists({ userId, projectIdeaId }));
  return memory.feedback.find((f) => f.userId === String(userId) && f.projectIdeaId === String(projectIdeaId)).length > 0;
}

module.exports = { upsert, existsFor };

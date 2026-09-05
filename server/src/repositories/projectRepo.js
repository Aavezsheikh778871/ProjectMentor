/**
 * ProjectIdea repository - Mongo when connected, in-memory store otherwise.
 * Handles the "saved projects" list, explore/browse, ratings, and the
 * cached detailed plan.
 */
'use strict';

const crypto = require('node:crypto');
const { isDbConnected } = require('../config/db');
const ProjectIdea = require('../models/ProjectIdea');
const memory = require('../utils/memoryStore');

function memDefaults(doc) {
  return {
    problemStatement: '',
    suggestedTechStack: [],
    features: [],
    developmentSteps: [],
    improvements: [],
    innovationFactor: '',
    feasibilityScore: 7,
    industryRelevanceScore: 7,
    rating: 0,
    ratingCount: 0,
    status: 'idea',
    detailedPlan: null,
    abstract: '',
    shareId: crypto.randomBytes(6).toString('base64url'),
    source: 'fallback',
    ...doc,
  };
}

async function create(ownerId, data) {
  if (isDbConnected()) return ProjectIdea.create({ ...data, generatedBy: ownerId });
  return memory.projects.create(memDefaults({ ...data, generatedBy: String(ownerId) }));
}

async function findById(id) {
  if (isDbConnected()) return ProjectIdea.findById(id);
  return memory.projects.findById(id);
}

async function findByShareId(shareId) {
  if (isDbConnected()) return ProjectIdea.findOne({ shareId });
  return memory.projects.find((p) => p.shareId === shareId)[0] || null;
}

async function listByOwner(ownerId) {
  if (isDbConnected()) return ProjectIdea.find({ generatedBy: ownerId }).sort({ createdAt: -1 });
  return memory.projects
    .find((p) => p.generatedBy === String(ownerId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deleteOwned(id, ownerId) {
  if (isDbConnected()) {
    const doc = await ProjectIdea.findOne({ _id: id, generatedBy: ownerId });
    if (!doc) return false;
    await ProjectIdea.deleteOne({ _id: id });
    return true;
  }
  const doc = memory.projects.findById(id);
  if (!doc || doc.generatedBy !== String(ownerId)) return false;
  return memory.projects.deleteById(id);
}

async function updateById(id, updates) {
  if (isDbConnected()) return ProjectIdea.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  return memory.projects.updateById(id, updates);
}

/** Explore/browse listing with optional domain/difficulty filters, newest first. */
async function browse({ domain, difficulty, limit = 30 } = {}) {
  if (isDbConnected()) {
    const query = {};
    if (domain) query.domain = domain;
    if (difficulty) query.difficultyLevel = difficulty;
    return ProjectIdea.find(query).sort({ createdAt: -1 }).limit(limit);
  }
  let list = memory.projects.all();
  if (domain) list = list.filter((p) => p.domain === domain);
  if (difficulty) list = list.filter((p) => p.difficultyLevel === difficulty);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}

/** Fold a new 1-5 rating into the running average. */
async function applyRating(id, newRating) {
  if (isDbConnected()) {
    const doc = await ProjectIdea.findById(id);
    if (!doc) return null;
    doc.recomputeRating(newRating);
    await doc.save();
    return doc;
  }
  const doc = memory.projects.findById(id);
  if (!doc) return null;
  const ratingCount = (doc.ratingCount || 0) + 1;
  const rating = Math.round(((doc.rating * (doc.ratingCount || 0) + newRating) / ratingCount) * 10) / 10;
  return memory.projects.updateById(id, { rating, ratingCount });
}

module.exports = { create, findById, findByShareId, listByOwner, deleteOwned, updateById, browse, applyRating };

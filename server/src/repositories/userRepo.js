/**
 * User repository. Every controller goes through here instead of touching
 * Mongoose or the memory store directly, so auth/profile logic works
 * identically whether or not MONGODB_URI is configured.
 */
'use strict';

const bcrypt = require('bcryptjs');
const { isDbConnected } = require('../config/db');
const User = require('../models/User');
const memory = require('../utils/memoryStore');

const SALT_ROUNDS = 10;

function normEmail(email) {
  return String(email || '').toLowerCase().trim();
}

/** Strip the password hash regardless of which backend produced the record. */
function toSafe(user) {
  if (!user) return null;
  if (typeof user.toSafeJSON === 'function') return user.toSafeJSON();
  const { password, ...rest } = user;
  return rest;
}

async function findByEmailWithPassword(email) {
  const e = normEmail(email);
  if (isDbConnected()) return User.findOne({ email: e }).select('+password');
  return memory.users.find((u) => u.email === e)[0] || null;
}

async function findById(id) {
  if (isDbConnected()) return User.findById(id);
  return memory.users.findById(id);
}

/** @returns {Promise<{user?: object, error?: 'exists'}>} */
async function create({ name, email, password, college, branch, year, skills, interests }) {
  const normalizedEmail = normEmail(email);

  if (isDbConnected()) {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return { error: 'exists' };
    const user = await User.create({ name, email: normalizedEmail, password, college, branch, year, skills, interests });
    return { user };
  }

  const existing = memory.users.find((u) => u.email === normalizedEmail)[0];
  if (existing) return { error: 'exists' };
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = memory.users.create({
    name,
    email: normalizedEmail,
    password: passwordHash,
    college: college || '',
    branch: branch || '',
    year: year || '4',
    skills: skills || [],
    interests: interests || [],
    savedProjects: [],
    mentorHistory: [],
    stats: { ideasGenerated: 0, mentorSessions: 0 },
    preferences: { theme: 'dark', difficulty: 'Intermediate' },
  });
  return { user };
}

async function comparePassword(user, candidate) {
  if (typeof user.comparePassword === 'function') return user.comparePassword(candidate);
  return bcrypt.compare(candidate, user.password);
}

/** Merge shallow field updates (skills/interests/college/branch/year/preferences). */
async function updateProfile(id, updates) {
  if (isDbConnected()) {
    return User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  }
  return memory.users.updateById(String(id), updates);
}

async function incrementStat(id, field, by = 1) {
  if (isDbConnected()) {
    return User.findByIdAndUpdate(id, { $inc: { [`stats.${field}`]: by } }, { new: true });
  }
  const user = memory.users.findById(String(id));
  if (!user) return null;
  const stats = { ...(user.stats || {}), [field]: (user.stats?.[field] || 0) + by };
  return memory.users.updateById(String(id), { stats });
}

module.exports = { toSafe, findByEmailWithPassword, findById, create, comparePassword, updateProfile, incrementStat };

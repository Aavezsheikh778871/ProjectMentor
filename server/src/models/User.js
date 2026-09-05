/**
 * User model — ProjectMentor AI
 *
 * Represents a final-year student using the platform. Holds the auth
 * credentials (email + hashed password), the academic profile used to
 * personalise idea generation (college, branch, year, skills, interests),
 * the student's saved projects and mentor conversation history, plus light
 * usage stats and UI preferences.
 *
 * Notes:
 *  - `password` is stored as a bcrypt hash and is `select: false`, so it is
 *    never returned unless a query explicitly asks for `+password`.
 *  - `savedProjects` / `mentorHistory` are reference arrays, so the API layer
 *    can `.populate()` them for the dashboard without duplicating data.
 *
 * @module models/User
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

/** Salt rounds for bcrypt. 10 is the accepted cost/latency balance for web auth. */
const SALT_ROUNDS = 10;

/** Pragmatic email shape check — real validation happens via the signup flow. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Aggregate counters shown on the student dashboard. Kept as a subdocument so
 * the counters can grow without touching the top-level shape.
 */
const statsSchema = new Schema(
  {
    ideasGenerated: { type: Number, default: 0, min: 0 },
    mentorSessions: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/** Client-side preferences persisted server-side so they follow the student. */
const preferencesSchema = new Schema(
  {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark',
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      // Field-level unique creates the unique index on `email`; we deliberately
      // do NOT also call schema.index({ email: 1 }) to avoid Mongoose's
      // duplicate-index warning.
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never ship the hash to the client by accident
    },
    college: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    year: {
      type: String,
      enum: ['1', '2', '3', '4', '5', 'PG', 'Other'],
      default: '4',
    },
    skills: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    interests: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    savedProjects: {
      type: [{ type: Schema.Types.ObjectId, ref: 'ProjectIdea' }],
      default: [],
    },
    mentorHistory: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Conversation' }],
      default: [],
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ------------------------------- Indexes -------------------------------- */

// Serves admin/analytics listings and the "newest students" ordering.
// (The unique index on `email` comes from the field-level `unique: true`.)
userSchema.index({ createdAt: -1 });

/* ------------------------------- Virtuals ------------------------------- */

/** Convenience counter for profile-completeness UI. */
userSchema.virtual('skillCount').get(function getSkillCount() {
  return Array.isArray(this.skills) ? this.skills.length : 0;
});

/* -------------------------------- Hooks --------------------------------- */

/**
 * Hash the password whenever it is set or changed. Guarded by `isModified`
 * so profile updates do not re-hash an already-hashed value.
 */
// Mongoose 9: pre middleware no longer takes a next() callback - async
// functions (or returned promises) are how you signal completion/errors.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

/* ------------------------------- Methods -------------------------------- */

/**
 * Compare a plaintext candidate against the stored hash.
 * Requires the document to have been loaded with `.select('+password')`;
 * returns `false` instead of throwing when the hash is absent.
 *
 * @param {string} candidate plaintext password supplied at login
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!candidate || !this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

/**
 * Plain object safe to send over the wire: no password hash, no `__v`.
 *
 * @returns {Object}
 */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.__v;
  return obj;
};

/* ---------------------------- Serialisation ----------------------------- */

// Second line of defence: even a raw res.json(user) cannot leak the hash.
userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

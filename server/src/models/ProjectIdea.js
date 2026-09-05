/**
 * ProjectIdea model — ProjectMentor AI
 *
 * A single generated (or hand-saved) final-year project idea, plus the
 * cached detailed plan once a student drills into it. `detailedPlan` stores
 * the full AI-service plan object as-is so we never have to regenerate it
 * on every page view.
 *
 * @module models/ProjectIdea
 */
'use strict';

const crypto = require('node:crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const featureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    tier: { type: String, enum: ['mvp', 'advanced'], default: 'mvp' },
  },
  { _id: false }
);

const developmentStepSchema = new Schema(
  {
    phase: { type: String, required: true, trim: true },
    tasks: { type: [String], default: [] },
    duration: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const projectIdeaSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    problemStatement: { type: String, default: '', trim: true },
    // indexed: filtering the explore/browse view by domain
    domain: { type: String, required: true, trim: true, index: true },
    // indexed: filtering the explore/browse view by difficulty
    difficultyLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
      index: true,
    },
    suggestedTechStack: { type: [String], default: [] },
    features: { type: [featureSchema], default: [] },
    developmentSteps: { type: [developmentStepSchema], default: [] },
    improvements: { type: [String], default: [] },
    innovationFactor: { type: String, default: '' },
    feasibilityScore: { type: Number, min: 1, max: 10, default: 7 },
    industryRelevanceScore: { type: Number, min: 1, max: 10, default: 7 },
    // indexed: "my projects" listing looks up by owner
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
    feedback: { type: [{ type: Schema.Types.ObjectId, ref: 'Feedback' }], default: [] },
    // indexed: filtering "my projects" by status
    status: { type: String, enum: ['idea', 'in-progress', 'completed'], default: 'idea', index: true },
    // Cached full plan from the AI service so we don't regenerate on every view.
    detailedPlan: { type: Schema.Types.Mixed, default: null },
    abstract: { type: String, default: '' },
    // Short public id for share links. Sparse+unique: most rows never get one.
    shareId: { type: String, unique: true, sparse: true },
    source: { type: String, enum: ['ai', 'fallback'], default: 'fallback' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ------------------------------- Indexes -------------------------------- */

// "My projects" list: owner's ideas newest first.
projectIdeaSchema.index({ generatedBy: 1, createdAt: -1 });
// Explore/browse filter: domain + difficulty combo.
projectIdeaSchema.index({ domain: 1, difficultyLevel: 1 });
// Free-text search across title/description for the explore search box.
projectIdeaSchema.index({ title: 'text', description: 'text' });

/* --------------------------------- Hooks --------------------------------- */

// Mongoose 9: pre middleware no longer takes a next() callback.
projectIdeaSchema.pre('validate', function generateShareId() {
  if (!this.shareId) {
    this.shareId = crypto.randomBytes(6).toString('base64url');
  }
});

/* ------------------------------- Virtuals -------------------------------- */

projectIdeaSchema.virtual('featureCount').get(function getFeatureCount() {
  return Array.isArray(this.features) ? this.features.length : 0;
});

/* ------------------------------- Methods --------------------------------- */

/**
 * Fold a new 1-5 rating into the running average and bump the count.
 * @param {number} newRating
 */
projectIdeaSchema.methods.recomputeRating = function recomputeRating(newRating) {
  const total = this.rating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.rating = Math.round((total / this.ratingCount) * 10) / 10;
  return this;
};

module.exports = mongoose.models.ProjectIdea || mongoose.model('ProjectIdea', projectIdeaSchema);

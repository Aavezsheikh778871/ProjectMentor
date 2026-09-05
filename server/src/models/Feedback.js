/**
 * Feedback model — ProjectMentor AI
 *
 * A student's rating + comment on one ProjectIdea. One rating per
 * (user, project) pair.
 *
 * @module models/Feedback
 */
'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectIdeaId: { type: Schema.Types.ObjectId, ref: 'ProjectIdea', required: true, index: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number between 1 and 5',
      },
    },
    comment: { type: String, trim: true, default: '', maxlength: 1000 },
    suggestions: { type: [String], default: [] },
  },
  { timestamps: true }
);

/* ------------------------------- Indexes -------------------------------- */

// One rating per student per project - also serves "has this user already rated?".
feedbackSchema.index({ userId: 1, projectIdeaId: 1 }, { unique: true });
// Project's feedback feed, newest first.
feedbackSchema.index({ projectIdeaId: 1, createdAt: -1 });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

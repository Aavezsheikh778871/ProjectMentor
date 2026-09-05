/**
 * Conversation model — ProjectMentor AI
 *
 * One mentor chat thread. Optionally scoped to a saved ProjectIdea so the
 * AI service can ground its replies in that project's context.
 *
 * @module models/Conversation
 */
'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'ai'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new Schema(
  {
    // indexed: sidebar list looks up "my conversations" newest first
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectIdeaId: { type: Schema.Types.ObjectId, ref: 'ProjectIdea', default: null },
    topic: { type: String, trim: true, default: 'New conversation', maxlength: 200 },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ------------------------------- Indexes -------------------------------- */

// Conversation sidebar: this user's threads, most recently active first.
conversationSchema.index({ userId: 1, updatedAt: -1 });

/* ------------------------------- Virtuals -------------------------------- */

conversationSchema.virtual('lastMessage').get(function getLastMessage() {
  return this.messages.length ? this.messages[this.messages.length - 1] : null;
});

conversationSchema.virtual('messageCount').get(function getMessageCount() {
  return this.messages.length;
});

/* ------------------------------- Methods --------------------------------- */

const DEFAULT_TOPIC = 'New conversation';

/**
 * Append a message. If the topic is still the default and this is the
 * student's first message, derive a short topic from it.
 * @param {'user'|'ai'} role
 * @param {string} content
 */
conversationSchema.methods.addMessage = function addMessage(role, content) {
  this.messages.push({ role, content, timestamp: new Date() });
  if (role === 'user' && this.topic === DEFAULT_TOPIC) {
    const trimmed = content.trim().slice(0, 60);
    this.topic = trimmed.length < content.trim().length ? `${trimmed}…` : trimmed || DEFAULT_TOPIC;
  }
  return this;
};

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

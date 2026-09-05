/**
 * Conversation repository - Mongo when connected, in-memory store otherwise.
 */
'use strict';

const { isDbConnected } = require('../config/db');
const Conversation = require('../models/Conversation');
const memory = require('../utils/memoryStore');

const DEFAULT_TOPIC = 'New conversation';

function memAddMessage(convo, role, content) {
  const messages = [...(convo.messages || []), { role, content, timestamp: new Date() }];
  let topic = convo.topic;
  if (role === 'user' && topic === DEFAULT_TOPIC) {
    const trimmed = content.trim().slice(0, 60);
    topic = trimmed.length < content.trim().length ? `${trimmed}\u2026` : trimmed || DEFAULT_TOPIC;
  }
  return memory.conversations.updateById(convo._id, { messages, topic });
}

async function create(userId, { projectIdeaId = null, topic = DEFAULT_TOPIC } = {}) {
  if (isDbConnected()) return Conversation.create({ userId, projectIdeaId, topic });
  return memory.conversations.create({ userId: String(userId), projectIdeaId, topic, messages: [] });
}

async function findById(id) {
  if (isDbConnected()) return Conversation.findById(id);
  return memory.conversations.findById(id);
}

async function listByUser(userId) {
  if (isDbConnected()) return Conversation.find({ userId }).sort({ updatedAt: -1 });
  return memory.conversations
    .find((c) => c.userId === String(userId))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function addMessage(id, role, content) {
  if (isDbConnected()) {
    const convo = await Conversation.findById(id);
    if (!convo) return null;
    convo.addMessage(role, content);
    await convo.save();
    return convo;
  }
  const convo = memory.conversations.findById(id);
  if (!convo) return null;
  return memAddMessage(convo, role, content);
}

async function deleteOwned(id, userId) {
  if (isDbConnected()) {
    const convo = await Conversation.findOne({ _id: id, userId });
    if (!convo) return false;
    await Conversation.deleteOne({ _id: id });
    return true;
  }
  const convo = memory.conversations.findById(id);
  if (!convo || convo.userId !== String(userId)) return false;
  return memory.conversations.deleteById(id);
}

module.exports = { create, findById, listByUser, addMessage, deleteOwned, DEFAULT_TOPIC };

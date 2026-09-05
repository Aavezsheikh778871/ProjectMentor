/**
 * Mentor controller: chat with the AI mentor, list/fetch/delete
 * conversations. Each chat turn is persisted so history survives reloads.
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const aiService = require('../services/aiService');
const conversationRepo = require('../repositories/conversationRepo');
const projectRepo = require('../repositories/projectRepo');
const userRepo = require('../repositories/userRepo');

/** POST /api/mentor/chat */
const chat = asyncHandler(async (req, res) => {
  const { message, conversationId, projectId } = req.body;

  let convo = conversationId ? await conversationRepo.findById(conversationId) : null;
  let project = projectId ? await projectRepo.findById(projectId) : null;

  if (!convo) {
    convo = await conversationRepo.create(req.user._id, { projectIdeaId: project?._id || null });
    await userRepo.incrementStat(req.user._id, 'mentorSessions', 1);
  }
  if (!project && convo.projectIdeaId) {
    project = await projectRepo.findById(convo.projectIdeaId);
  }

  const history = (convo.messages || []).map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
  const projectContext = project
    ? { title: project.title, description: project.description, domain: project.domain, techStack: project.suggestedTechStack }
    : null;

  const { reply, source } = await aiService.mentorChat(history, message, projectContext);

  await conversationRepo.addMessage(convo._id, 'user', message);
  const updatedConvo = await conversationRepo.addMessage(convo._id, 'ai', reply);

  return ok(res, { conversation: updatedConvo, reply, source });
});

/** GET /api/mentor/conversations */
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await conversationRepo.listByUser(req.user._id);
  return ok(res, { conversations });
});

/** GET /api/mentor/conversation/:id */
const getConversation = asyncHandler(async (req, res) => {
  const convo = await conversationRepo.findById(req.params.id);
  if (!convo || String(convo.userId) !== String(req.user._id)) {
    throw ApiError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
  }
  return ok(res, { conversation: convo });
});

/** DELETE /api/mentor/conversation/:id */
const deleteConversation = asyncHandler(async (req, res) => {
  const removedOk = await conversationRepo.deleteOwned(req.params.id, req.user._id);
  if (!removedOk) throw ApiError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
  return ok(res, null, 'Conversation deleted');
});

module.exports = { chat, listConversations, getConversation, deleteConversation };

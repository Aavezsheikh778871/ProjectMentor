/**
 * Project ideas controller: generate, save/unsave, list, details, improve,
 * status updates. Generation is stateless (no DB write); saving persists.
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created, fail } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const aiService = require('../services/aiService');
const projectRepo = require('../repositories/projectRepo');
const userRepo = require('../repositories/userRepo');

/** POST /api/projects/generate */
const generate = asyncHandler(async (req, res) => {
  const profile = {
    branch: req.body.branch || req.user?.branch || '',
    skills: req.body.skills?.length ? req.body.skills : req.user?.skills || [],
    interests: req.body.interests?.length ? req.body.interests : req.user?.interests || [],
    difficulty: req.body.difficulty,
    projectType: req.body.projectType,
    additionalRequirements: req.body.additionalRequirements,
  };

  const result = await aiService.generateProjectIdeas(profile);

  if (req.user && !result.cached) {
    await userRepo.incrementStat(req.user._id, 'ideasGenerated', 1);
  }

  return ok(res, result);
});

/** GET /api/projects/saved */
const listSaved = asyncHandler(async (req, res) => {
  const projects = await projectRepo.listByOwner(req.user._id);
  return ok(res, { projects });
});

/** POST /api/projects/save/:id  — :id here is a client-generated temp id, body carries the idea */
const saveIdea = asyncHandler(async (req, res) => {
  const project = await projectRepo.create(req.user._id, req.body);
  return created(res, { project }, 'Idea saved');
});

/** DELETE /api/projects/saved/:id */
const removeSaved = asyncHandler(async (req, res) => {
  const removedOk = await projectRepo.deleteOwned(req.params.id, req.user._id);
  if (!removedOk) throw ApiError.notFound('Saved project not found', 'PROJECT_NOT_FOUND');
  return ok(res, null, 'Removed');
});

/** GET /api/projects/details/:id — returns cached plan, generating it once if absent */
const getDetails = asyncHandler(async (req, res) => {
  const project = await projectRepo.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND');

  if (project.detailedPlan) {
    return ok(res, { project, plan: project.detailedPlan, source: project.source, cached: true });
  }

  const { plan, source } = await aiService.getDetailedProjectPlan(project.title, project.description, req.user?.skills || []);
  const updated = await projectRepo.updateById(project._id, { detailedPlan: plan, source });
  return ok(res, { project: updated || project, plan, source, cached: false });
});

/** POST /api/projects/improve/:id */
const improve = asyncHandler(async (req, res) => {
  const project = await projectRepo.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND');

  const result = await aiService.suggestImprovements(
    { title: project.title, description: project.description },
    req.body.currentProgress
  );
  return ok(res, result);
});

/** PUT /api/projects/status/:id */
const updateStatus = asyncHandler(async (req, res) => {
  const owned = await projectRepo.findById(req.params.id);
  if (!owned || String(owned.generatedBy) !== String(req.user._id)) {
    throw ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND');
  }
  const updated = await projectRepo.updateById(req.params.id, { status: req.body.status });
  return ok(res, { project: updated }, 'Status updated');
});

module.exports = { generate, listSaved, saveIdea, removeSaved, getDetails, improve, updateStatus };

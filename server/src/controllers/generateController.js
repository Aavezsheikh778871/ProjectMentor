/**
 * /api/generate - focused single-purpose AI generation endpoints built on
 * top of the same aiService used by /api/projects. techstack/architecture/
 * features are extracted from the full plan; timeline maps to
 * developmentSteps; abstract has its own dedicated service function.
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const aiService = require('../services/aiService');

/** POST /api/generate/techstack */
const techstack = asyncHandler(async (req, res) => {
  const { title, description, skills } = req.body;
  const { plan, source, cached } = await aiService.getDetailedProjectPlan(title, description, skills);
  return ok(res, { techStack: plan.techStack, source, cached });
});

/** POST /api/generate/timeline */
const timeline = asyncHandler(async (req, res) => {
  const { title, description, skills } = req.body;
  const { plan, source, cached } = await aiService.getDetailedProjectPlan(title, description, skills);
  return ok(res, { developmentSteps: plan.developmentSteps, source, cached });
});

/** POST /api/generate/abstract */
const abstract = asyncHandler(async (req, res) => {
  const result = await aiService.generateAbstractAndSynopsis(req.body);
  return ok(res, result);
});

/** POST /api/generate/features */
const features = asyncHandler(async (req, res) => {
  const { title, description, skills } = req.body;
  const { plan, source, cached } = await aiService.getDetailedProjectPlan(title, description, skills);
  return ok(res, { features: plan.features, source, cached });
});

/** POST /api/generate/architecture */
const architecture = asyncHandler(async (req, res) => {
  const { title, description, skills } = req.body;
  const { plan, source, cached } = await aiService.getDetailedProjectPlan(title, description, skills);
  return ok(res, {
    architectureSummary: plan.architectureSummary,
    architectureDiagram: plan.architectureDiagram,
    apiEndpoints: plan.apiEndpoints,
    databaseDesign: plan.databaseDesign,
    source,
    cached,
  });
});

module.exports = { techstack, timeline, abstract, features, architecture };

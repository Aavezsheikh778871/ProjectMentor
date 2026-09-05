/**
 * /api/explore - public browsing of community-generated ideas. No auth
 * required by design (these routes are explicitly excluded from `protect`).
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { DOMAINS } = require('../services/knowledge');
const projectRepo = require('../repositories/projectRepo');
const feedbackRepo = require('../repositories/feedbackRepo');

/** GET /api/explore/trending — most-viewed domains, derived from the knowledge base for a zero-data cold start. */
const trending = asyncHandler(async (req, res) => {
  const all = await projectRepo.browse({ limit: 500 });
  const counts = new Map();
  all.forEach((p) => counts.set(p.domain, (counts.get(p.domain) || 0) + 1));

  const ranked = DOMAINS.map((d) => ({ domain: d.label, count: counts.get(d.label) || 0 })).sort((a, b) => b.count - a.count);
  return ok(res, { trending: ranked });
});

/** GET /api/explore/ideas?domain=&difficulty= */
const browseIdeas = asyncHandler(async (req, res) => {
  const { domain, difficulty } = req.query;
  const projects = await projectRepo.browse({ domain: domain || undefined, difficulty: difficulty || undefined });
  return ok(res, { projects });
});

/** POST /api/explore/rate/:id — requires auth even though the group is public, so ratings are attributable */
const rate = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized('Log in to rate an idea', 'LOGIN_REQUIRED');

  const project = await projectRepo.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND');

  const already = await feedbackRepo.existsFor(req.user._id, project._id);
  await feedbackRepo.upsert(req.user._id, project._id, req.body);
  const updated = await projectRepo.applyRating(project._id, req.body.rating);

  return ok(res, { project: updated }, already ? 'Rating updated' : 'Rating recorded');
});

module.exports = { trending, browseIdeas, rate };

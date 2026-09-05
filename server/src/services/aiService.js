/**
 * Public AI service API. Every exported function follows the same shape:
 *   1. validate input
 *   2. check cache (skipped for mentorChat)
 *   3. if no provider configured, use the offline fallback engine directly
 *   4. otherwise call the provider with retry, parse its JSON, and repair
 *      any missing/invalid fields by merging in the fallback engine's
 *      result for the same input
 *   5. on unrecoverable provider failure, return the fallback engine result
 *
 * Nothing here ever throws for a recoverable problem - only for genuinely
 * unusable input (ApiError.badRequest). A flaky or misconfigured LLM
 * degrades to the deterministic engine instead of breaking the demo.
 */
'use strict';

const config = require('../config');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const providers = require('./providers');
const prompts = require('./prompts');
const fallbackEngine = require('./fallbackEngine');

/* ------------------------------ helpers ------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function statusFromMessage(msg) {
  const m = /\((\d{3})\)/.exec(String(msg || ''));
  return m ? Number(m[1]) : null;
}

/**
 * Retry a provider call up to 3 attempts with backoff, but never retry a
 * 4xx (auth/bad-request) response - that will just fail again.
 */
async function withRetry(fn, delays = [400, 1200]) {
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = statusFromMessage(err.message);
      const isAuthOrBadRequest = status !== null && status >= 400 && status < 500;
      if (isAuthOrBadRequest || attempt === delays.length) throw err;
      await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}

/** Strip fenced code blocks, then parse JSON; fall back to slicing the outermost {...}. */
function extractJson(text) {
  if (!text || !text.trim()) throw new Error('Empty response from provider');
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
      throw new Error('Could not locate a JSON object in the provider response');
    }
    return JSON.parse(t.slice(first, last + 1));
  }
}

function asStringArray(value, fallback) {
  if (Array.isArray(value) && value.length) return value.map((v) => String(v));
  return fallback;
}

function coerceScore(value, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(10, n));
}

function stripInternalFields({ _archetypeKey, _datasetHint, ...rest }) {
  return rest;
}

/* ------------------------------ normalisers ------------------------------ */
/* Each takes the raw parsed AI JSON (possibly malformed/partial) plus the
   fallback-engine result for the same input, and returns a schema-safe
   value with any missing/invalid field repaired from the fallback.       */

function normaliseIdea(raw, fb) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fb.title,
    problemStatement: typeof raw.problemStatement === 'string' && raw.problemStatement.trim() ? raw.problemStatement.trim() : fb.problemStatement,
    description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : fb.description,
    domain: typeof raw.domain === 'string' && raw.domain.trim() ? raw.domain.trim() : fb.domain,
    innovationFactor: typeof raw.innovationFactor === 'string' && raw.innovationFactor.trim() ? raw.innovationFactor.trim() : fb.innovationFactor,
    feasibilityScore: coerceScore(raw.feasibilityScore, fb.feasibilityScore),
    industryRelevanceScore: coerceScore(raw.industryRelevanceScore, fb.industryRelevanceScore),
    suggestedTechStack: asStringArray(raw.suggestedTechStack, fb.suggestedTechStack),
    difficultyLevel: ['Beginner', 'Intermediate', 'Advanced'].includes(raw.difficultyLevel) ? raw.difficultyLevel : fb.difficultyLevel,
  };
}

function normaliseIdeasResponse(parsed, fallbackIdeas) {
  const rawList = Array.isArray(parsed?.ideas) ? parsed.ideas : [];
  const out = [];
  for (let i = 0; i < 5; i += 1) {
    out.push(normaliseIdea(rawList[i], fallbackIdeas[i]));
  }
  return out;
}

function normaliseFeatureList(value, fb) {
  if (!Array.isArray(value) || !value.length) return fb;
  return value.map((f, i) => ({
    title: typeof f?.title === 'string' && f.title.trim() ? f.title.trim() : fb[i]?.title || `Feature ${i + 1}`,
    description: typeof f?.description === 'string' ? f.description.trim() : fb[i]?.description || '',
  }));
}

function normalisePlan(raw, fb) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const rawFeatures = raw.features && typeof raw.features === 'object' ? raw.features : {};
  const mvp = normaliseFeatureList(rawFeatures.mvp, fb.features.mvp);
  const advanced = normaliseFeatureList(rawFeatures.advanced, fb.features.advanced);

  const techStackRaw = Array.isArray(raw.techStack)
    ? raw.techStack
        .map((t) => ({ layer: String(t?.layer || ''), choice: String(t?.choice || ''), justification: String(t?.justification || '') }))
        .filter((t) => t.layer && t.choice)
    : [];

  const stepsRaw = Array.isArray(raw.developmentSteps)
    ? raw.developmentSteps.map((s, i) => ({
        phase: typeof s?.phase === 'string' && s.phase.trim() ? s.phase.trim() : fb.developmentSteps[i]?.phase || `Phase ${i + 1}`,
        tasks: asStringArray(s?.tasks, fb.developmentSteps[i]?.tasks || []),
        duration: typeof s?.duration === 'string' && s.duration.trim() ? s.duration.trim() : fb.developmentSteps[i]?.duration || '',
      }))
    : [];

  const collectionsRaw = Array.isArray(raw.databaseDesign?.collections)
    ? raw.databaseDesign.collections
        .map((c) => ({ name: String(c?.name || ''), fields: asStringArray(c?.fields, []), notes: String(c?.notes || '') }))
        .filter((c) => c.name)
    : [];

  const endpointsRaw = Array.isArray(raw.apiEndpoints)
    ? raw.apiEndpoints
        .map((e) => ({ method: String(e?.method || 'GET').toUpperCase(), path: String(e?.path || ''), purpose: String(e?.purpose || '') }))
        .filter((e) => e.path)
    : [];

  const challengesRaw = Array.isArray(raw.challenges)
    ? raw.challenges.map((c) => ({ challenge: String(c?.challenge || ''), solution: String(c?.solution || '') })).filter((c) => c.challenge)
    : [];

  const deploymentRaw = raw.deployment && typeof raw.deployment === 'object' ? raw.deployment : {};

  return {
    features: {
      mvp: mvp.length >= 2 ? mvp : fb.features.mvp,
      advanced: advanced.length >= 1 ? advanced : fb.features.advanced,
    },
    techStack: techStackRaw.length >= 4 ? techStackRaw : fb.techStack,
    developmentSteps: stepsRaw.length >= 5 ? stepsRaw : fb.developmentSteps,
    databaseDesign: { collections: collectionsRaw.length ? collectionsRaw : fb.databaseDesign.collections },
    apiEndpoints: endpointsRaw.length >= 5 ? endpointsRaw : fb.apiEndpoints,
    challenges: challengesRaw.length >= 3 ? challengesRaw : fb.challenges,
    testingStrategy: asStringArray(raw.testingStrategy, fb.testingStrategy),
    deployment: {
      frontend: String(deploymentRaw.frontend || fb.deployment.frontend),
      backend: String(deploymentRaw.backend || fb.deployment.backend),
      database: String(deploymentRaw.database || fb.deployment.database),
      steps: asStringArray(deploymentRaw.steps, fb.deployment.steps),
    },
    architectureSummary: typeof raw.architectureSummary === 'string' && raw.architectureSummary.trim() ? raw.architectureSummary.trim() : fb.architectureSummary,
    architectureDiagram: typeof raw.architectureDiagram === 'string' && raw.architectureDiagram.trim() ? raw.architectureDiagram.trim() : fb.architectureDiagram,
  };
}

function normaliseImprovements(raw, fb) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return {
    featureEnhancements: asStringArray(raw.featureEnhancements, fb.featureEnhancements),
    optimizations: asStringArray(raw.optimizations, fb.optimizations),
    scaling: asStringArray(raw.scaling, fb.scaling),
    differentiators: asStringArray(raw.differentiators, fb.differentiators),
  };
}

function normaliseAbstract(raw, fb) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const wordCount = typeof raw.abstract === 'string' ? raw.abstract.trim().split(/\s+/).filter(Boolean).length : 0;
  const abstractText = wordCount >= 80 ? raw.abstract.trim() : fb.abstract;

  const outline = Array.isArray(raw.synopsisOutline)
    ? raw.synopsisOutline
        .map((s) => ({ section: String(s?.section || ''), points: asStringArray(s?.points, []) }))
        .filter((s) => s.section)
    : [];

  return {
    abstract: abstractText,
    synopsisOutline: outline.length >= 4 ? outline : fb.synopsisOutline,
    keywords: asStringArray(raw.keywords, fb.keywords),
  };
}

/* ------------------------------ public API ------------------------------ */

/**
 * @param {object} userProfile { branch, skills, interests, difficulty, projectType, additionalRequirements }
 * @returns {Promise<{ideas: object[], source: 'ai'|'fallback', cached: boolean}>}
 */
async function generateProjectIdeas(userProfile) {
  const profile = userProfile || {};
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];
  const interests = Array.isArray(profile.interests) ? profile.interests.filter(Boolean) : [];
  if (skills.length === 0 && interests.length === 0) {
    throw ApiError.badRequest('Provide at least one skill or interest to generate ideas', 'MISSING_PROFILE_INPUT');
  }

  const cacheKey = cache.makeKey('ideas', {
    branch: String(profile.branch || '').toLowerCase().trim(),
    skills: skills.map((s) => String(s).toLowerCase().trim()).sort(),
    interests: interests.map((s) => String(s).toLowerCase().trim()).sort(),
    difficulty: profile.difficulty || 'Intermediate',
    projectType: profile.projectType || '',
    additionalRequirements: String(profile.additionalRequirements || '').toLowerCase().trim(),
  });

  const cached = await cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const fallbackIdeas = fallbackEngine.ideas(profile).map(stripInternalFields);
  let value;

  if (providers.activeProvider() === 'fallback') {
    value = { ideas: fallbackIdeas, source: 'fallback' };
  } else {
    try {
      const { system, user } = prompts.ideasPrompt(profile);
      const text = await withRetry(() => providers.complete({ system, user, json: true, maxTokens: 3000 }));
      const parsed = extractJson(text);
      value = { ideas: normaliseIdeasResponse(parsed, fallbackIdeas), source: 'ai' };
    } catch (err) {
      logger.warn(`[aiService] generateProjectIdeas -> falling back to engine: ${err.message}`);
      value = { ideas: fallbackIdeas, source: 'fallback' };
    }
  }

  await cache.set(cacheKey, value, config.cacheTtlSeconds);
  return { ...value, cached: false };
}

/**
 * @returns {Promise<{plan: object, source: 'ai'|'fallback', cached: boolean}>}
 */
async function getDetailedProjectPlan(projectTitle, projectDescription, userSkills) {
  if (!projectTitle || !String(projectTitle).trim() || !projectDescription || !String(projectDescription).trim()) {
    throw ApiError.badRequest('projectTitle and projectDescription are required', 'MISSING_PROJECT_INPUT');
  }
  const skills = Array.isArray(userSkills) ? userSkills.filter(Boolean) : [];

  const cacheKey = cache.makeKey('plan', {
    title: String(projectTitle).toLowerCase().trim(),
    description: String(projectDescription).toLowerCase().trim(),
    skills: skills.map((s) => String(s).toLowerCase().trim()).sort(),
  });

  const cached = await cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const fallbackPlan = fallbackEngine.plan(projectTitle, projectDescription, skills, 14);
  let value;

  if (providers.activeProvider() === 'fallback') {
    value = { plan: fallbackPlan, source: 'fallback' };
  } else {
    try {
      const { system, user } = prompts.planPrompt(projectTitle, projectDescription, skills);
      const text = await withRetry(() => providers.complete({ system, user, json: true, maxTokens: 3500 }));
      const parsed = extractJson(text);
      value = { plan: normalisePlan(parsed, fallbackPlan), source: 'ai' };
    } catch (err) {
      logger.warn(`[aiService] getDetailedProjectPlan -> falling back to engine: ${err.message}`);
      value = { plan: fallbackPlan, source: 'fallback' };
    }
  }

  await cache.set(cacheKey, value, config.cacheTtlSeconds);
  return { ...value, cached: false };
}

/**
 * Not cached - conversation is inherently unique per call.
 * @returns {Promise<{reply: string, source: 'ai'|'fallback', cached: false}>}
 */
async function mentorChat(conversationHistory, currentQuestion, projectContext) {
  if (!currentQuestion || !String(currentQuestion).trim()) {
    throw ApiError.badRequest('currentQuestion is required', 'MISSING_QUESTION');
  }
  const history = Array.isArray(conversationHistory) ? conversationHistory : [];

  if (providers.activeProvider() === 'fallback') {
    return { reply: fallbackEngine.mentorReply(history, currentQuestion, projectContext), source: 'fallback', cached: false };
  }

  try {
    const { system, user } = prompts.mentorPrompt(history, currentQuestion, projectContext);
    const text = await withRetry(() => providers.complete({ system, user, json: false, maxTokens: 1200, temperature: 0.7 }));
    if (!text || !text.trim()) throw new Error('Empty mentor response');
    return { reply: text.trim(), source: 'ai', cached: false };
  } catch (err) {
    logger.warn(`[aiService] mentorChat -> falling back to engine: ${err.message}`);
    return { reply: fallbackEngine.mentorReply(history, currentQuestion, projectContext), source: 'fallback', cached: false };
  }
}

/**
 * @returns {Promise<{improvements: object, source: 'ai'|'fallback', cached: boolean}>}
 */
async function suggestImprovements(projectDetails, currentProgress) {
  if (!projectDetails || !projectDetails.title || !String(projectDetails.title).trim()) {
    throw ApiError.badRequest('projectDetails.title is required', 'MISSING_PROJECT_DETAILS');
  }

  const cacheKey = cache.makeKey('improvements', {
    title: String(projectDetails.title).toLowerCase().trim(),
    description: String(projectDetails.description || '').toLowerCase().trim(),
    progress: String(currentProgress || '').toLowerCase().trim(),
  });

  const cached = await cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const fallbackImprovements = fallbackEngine.improvements(projectDetails, currentProgress);
  let value;

  if (providers.activeProvider() === 'fallback') {
    value = { improvements: fallbackImprovements, source: 'fallback' };
  } else {
    try {
      const { system, user } = prompts.improvementsPrompt(projectDetails, currentProgress);
      const text = await withRetry(() => providers.complete({ system, user, json: true, maxTokens: 1500 }));
      const parsed = extractJson(text);
      value = { improvements: normaliseImprovements(parsed, fallbackImprovements), source: 'ai' };
    } catch (err) {
      logger.warn(`[aiService] suggestImprovements -> falling back to engine: ${err.message}`);
      value = { improvements: fallbackImprovements, source: 'fallback' };
    }
  }

  await cache.set(cacheKey, value, config.cacheTtlSeconds);
  return { ...value, cached: false };
}

/**
 * @returns {Promise<{abstract: string, synopsisOutline: object[], keywords: string[], source: 'ai'|'fallback', cached: boolean}>}
 */
async function generateAbstractAndSynopsis(projectDetails) {
  if (!projectDetails || !projectDetails.title || !String(projectDetails.title).trim()) {
    throw ApiError.badRequest('projectDetails.title is required', 'MISSING_PROJECT_DETAILS');
  }

  const cacheKey = cache.makeKey('abstract', {
    title: String(projectDetails.title).toLowerCase().trim(),
    description: String(projectDetails.description || '').toLowerCase().trim(),
    domain: String(projectDetails.domain || '').toLowerCase().trim(),
  });

  const cached = await cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const fallbackAbstract = fallbackEngine.abstract(projectDetails);
  let value;

  if (providers.activeProvider() === 'fallback') {
    value = { ...fallbackAbstract, source: 'fallback' };
  } else {
    try {
      const { system, user } = prompts.abstractPrompt(projectDetails);
      const text = await withRetry(() => providers.complete({ system, user, json: true, maxTokens: 1500 }));
      const parsed = extractJson(text);
      value = { ...normaliseAbstract(parsed, fallbackAbstract), source: 'ai' };
    } catch (err) {
      logger.warn(`[aiService] generateAbstractAndSynopsis -> falling back to engine: ${err.message}`);
      value = { ...fallbackAbstract, source: 'fallback' };
    }
  }

  await cache.set(cacheKey, value, config.cacheTtlSeconds);
  return { ...value, cached: false };
}

/** @returns {{provider: string, model: string, aiEnabled: boolean, cacheTtlSeconds: number}} */
function providerStatus() {
  return { ...providers.providerInfo(), cacheTtlSeconds: config.cacheTtlSeconds };
}

module.exports = {
  generateProjectIdeas,
  getDetailedProjectPlan,
  mentorChat,
  suggestImprovements,
  generateAbstractAndSynopsis,
  providerStatus,
};

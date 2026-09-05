'use strict';

// These tests force the offline path (no API key in the test env) so they
// are fast, deterministic, and require no network.
process.env.GEMINI_API_KEY = '';
process.env.OPENAI_API_KEY = '';
process.env.AI_PROVIDER = 'fallback';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const ai = require('../src/services/aiService');

const profile = { branch: 'CSE', skills: ['React', 'Python'], interests: ['HealthTech'], difficulty: 'Intermediate' };

test('aiService: reports fallback provider when no key configured', () => {
  const status = ai.providerStatus();
  assert.equal(status.provider, 'fallback');
  assert.equal(status.aiEnabled, false);
});

test('aiService: generateProjectIdeas returns 5 ideas with source fallback', async () => {
  const r = await ai.generateProjectIdeas(profile);
  assert.equal(r.ideas.length, 5);
  assert.equal(r.source, 'fallback');
  assert.equal(r.cached, false);
});

test('aiService: second identical call is served from cache', async () => {
  const p = { ...profile, interests: ['FinTech'] }; // unique to avoid cross-test cache hits
  const first = await ai.generateProjectIdeas(p);
  const second = await ai.generateProjectIdeas(p);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
});

test('aiService: reordered arrays hit the same cache entry (normalisation)', async () => {
  const p1 = { branch: 'IT', skills: ['A', 'B'], interests: ['EdTech'], difficulty: 'Beginner' };
  const p2 = { branch: 'IT', skills: ['B', 'A'], interests: ['EdTech'], difficulty: 'Beginner' };
  await ai.generateProjectIdeas(p1);
  const again = await ai.generateProjectIdeas(p2);
  assert.equal(again.cached, true);
});

test('aiService: rejects a profile with no skills and no interests', async () => {
  await assert.rejects(
    () => ai.generateProjectIdeas({ branch: 'CSE', skills: [], interests: [] }),
    (err) => err.status === 400
  );
});

test('aiService: detailed plan satisfies the documented contract', async () => {
  const { plan } = await ai.getDetailedProjectPlan('DermaScan', 'skin lesion classifier', ['Python']);
  assert.ok(plan.features.mvp.length >= 2);
  assert.ok(plan.features.advanced.length >= 1);
  assert.ok(plan.techStack.length >= 4);
  assert.ok(plan.apiEndpoints.length >= 5);
  assert.ok(plan.developmentSteps.length >= 5);
  assert.ok(typeof plan.architectureSummary === 'string' && plan.architectureSummary.length > 0);
});

test('aiService: mentor chat is never cached and returns a reply', async () => {
  const r = await ai.mentorChat([], 'How do I start?', { title: 'X', description: 'd', domain: 'HealthTech' });
  assert.equal(r.cached, false);
  assert.ok(r.reply.length > 100);
});

test('aiService: mentor chat rejects an empty question', async () => {
  await assert.rejects(() => ai.mentorChat([], '   ', null), (err) => err.status === 400);
});

test('aiService: improvements returns all four categories', async () => {
  const r = await ai.suggestImprovements({ title: 'X', description: 'd' }, 'MVP done');
  for (const key of ['featureEnhancements', 'optimizations', 'scaling', 'differentiators']) {
    assert.ok(r.improvements[key].length > 0);
  }
});

test('aiService: abstract generation returns text, outline and keywords', async () => {
  const r = await ai.generateAbstractAndSynopsis({ title: 'X', description: 'd', domain: 'HealthTech' });
  assert.ok(r.abstract.split(/\s+/).length >= 100);
  assert.ok(r.synopsisOutline.length >= 4);
  assert.ok(r.keywords.length > 0);
});

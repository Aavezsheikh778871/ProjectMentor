'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/services/fallbackEngine');

const profile = {
  branch: 'CSE',
  skills: ['Python', 'React', 'TensorFlow'],
  interests: ['HealthTech', 'AgriTech'],
  difficulty: 'Intermediate',
};

test('engine: generates exactly 5 ideas', () => {
  assert.equal(engine.ideas(profile).length, 5);
});

test('engine: identical profile produces identical ideas (deterministic)', () => {
  const a = engine.ideas(profile).map((i) => i.title);
  const b = engine.ideas(profile).map((i) => i.title);
  assert.deepEqual(a, b);
});

test('engine: all scores are integers within 1..10', () => {
  for (const idea of engine.ideas(profile)) {
    for (const score of [idea.feasibilityScore, idea.industryRelevanceScore]) {
      assert.ok(Number.isInteger(score), 'score is an integer');
      assert.ok(score >= 1 && score <= 10, 'score in [1,10]');
    }
  }
});

test('engine: at least 3 ideas match a declared interest', () => {
  const matching = engine.ideas(profile).filter((i) => profile.interests.includes(i.domain));
  assert.ok(matching.length >= 3, `expected >=3 matching, got ${matching.length}`);
});

test('engine: plan has MVP + advanced features, stack and endpoints', () => {
  const { plan } = { plan: engine.plan('Test', 'desc', profile.skills, 14) };
  assert.ok(plan.features.mvp.length >= 2);
  assert.ok(plan.features.advanced.length >= 1);
  assert.ok(plan.techStack.length >= 4);
  assert.ok(plan.apiEndpoints.length >= 5);
});

test('engine: roadmap spans exactly weeks 1..N with no gaps or overlaps', () => {
  for (const weeks of [4, 8, 12, 14, 16, 26]) {
    const phases = engine.plan('T', 'D', [], weeks).developmentSteps;
    let prevEnd = 0;
    for (const p of phases) {
      const m = /Week (\d+)(?:-(\d+))?/.exec(p.duration);
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : start;
      assert.equal(start, prevEnd + 1, `no gap before ${p.duration}`);
      assert.ok(end >= start, `phase end >= start for ${p.duration}`);
      prevEnd = end;
    }
    assert.equal(prevEnd, weeks, `last phase ends at week ${weeks}`);
  }
});

test('engine: mentor reply is substantial and references the project', () => {
  const reply = engine.mentorReply([], 'What tech stack should I use?', {
    title: 'DermaScan', description: 'skin lesion classifier', domain: 'HealthTech', techStack: ['Python'],
  });
  assert.ok(reply.length > 300);
  assert.ok(reply.includes('DermaScan'));
});

test('engine: improvements returns four non-empty categories', () => {
  const im = engine.improvements({ title: 'X', description: 'd' }, 'MVP done');
  for (const key of ['featureEnhancements', 'optimizations', 'scaling', 'differentiators']) {
    assert.ok(Array.isArray(im[key]) && im[key].length > 0, `${key} non-empty`);
  }
});

test('engine: abstract is an academic-length paragraph with outline', () => {
  const ab = engine.abstract({ title: 'X', description: 'd', domain: 'HealthTech' });
  const words = ab.abstract.trim().split(/\s+/).length;
  assert.ok(words >= 120 && words <= 300, `abstract words in range, got ${words}`);
  assert.ok(ab.synopsisOutline.length >= 4);
});

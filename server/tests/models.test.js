'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { User, ProjectIdea, Conversation, Feedback } = require('../src/models');

test('models: all four are exported', () => {
  assert.ok(User && ProjectIdea && Conversation && Feedback);
});

test('User: email is lowercased and password is required', async () => {
  const u = new User({ name: 'Test User', email: 'A@Test.COM', password: 'password123' });
  await u.validate();
  assert.equal(u.email, 'a@test.com');
  assert.equal(u.preferences.theme, 'dark');
});

test('User: comparePassword verifies a bcrypt hash', async () => {
  const u = new User({ name: 'Test User', email: 'b@test.com', password: 'password123' });
  u.password = await bcrypt.hash('password123', 10);
  assert.equal(await u.comparePassword('password123'), true);
  assert.equal(await u.comparePassword('wrong'), false);
});

test('User: toSafeJSON and toJSON never leak the password', async () => {
  const u = new User({ name: 'Test User', email: 'c@test.com', password: 'password123' });
  assert.ok(!('password' in u.toSafeJSON()));
  assert.ok(!('password' in u.toJSON()));
});

test('ProjectIdea: generates a shareId and defaults status to idea', async () => {
  const p = new ProjectIdea({ title: 'A Project', description: 'd', domain: 'HealthTech', generatedBy: new User()._id });
  await p.validate();
  assert.ok(typeof p.shareId === 'string' && p.shareId.length > 0);
  assert.equal(p.status, 'idea');
});

test('ProjectIdea: recomputeRating maintains a running average', () => {
  const p = new ProjectIdea({ title: 'A Project', description: 'd', domain: 'HealthTech', generatedBy: new User()._id });
  p.recomputeRating(4);
  p.recomputeRating(5);
  assert.equal(p.ratingCount, 2);
  assert.equal(p.rating, 4.5);
});

test('Conversation: addMessage derives the topic from the first user message', () => {
  const c = new Conversation({ userId: new User()._id });
  c.addMessage('user', 'How do I design the database for my crop disease detector?');
  assert.ok(c.topic.startsWith('How do I design'));
  assert.equal(c.messageCount, 1);
});

test('Feedback: rating must be an integer 1..5', async () => {
  const good = new Feedback({ userId: new User()._id, projectIdeaId: new ProjectIdea()._id, rating: 5 });
  await good.validate();
  const bad = new Feedback({ userId: new User()._id, projectIdeaId: new ProjectIdea()._id, rating: 7 });
  await assert.rejects(() => bad.validate());
});

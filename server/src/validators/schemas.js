/**
 * Zod request-body schemas, used with middleware/validate.js. Kept in one
 * file so every route's expected shape is easy to scan in one place.
 */
'use strict';

const { z } = require('zod');

const skillsInterests = z.array(z.string().trim().min(1)).default([]);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email(),
  password: z.string().min(8),
  college: z.string().trim().max(120).optional().default(''),
  branch: z.string().trim().max(60).optional().default(''),
  year: z.enum(['1', '2', '3', '4', '5', 'PG', 'Other']).optional().default('4'),
  skills: skillsInterests,
  interests: skillsInterests,
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const profileForGeneration = z.object({
  branch: z.string().trim().optional().default(''),
  skills: skillsInterests,
  interests: skillsInterests,
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional().default('Intermediate'),
  projectType: z.string().trim().optional().default(''),
  additionalRequirements: z.string().trim().max(2000).optional().default(''),
});

const saveIdeaSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1),
  problemStatement: z.string().trim().optional().default(''),
  domain: z.string().trim().min(1),
  difficultyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional().default('Intermediate'),
  suggestedTechStack: z.array(z.string()).optional().default([]),
  innovationFactor: z.string().trim().optional().default(''),
  feasibilityScore: z.number().int().min(1).max(10).optional().default(7),
  industryRelevanceScore: z.number().int().min(1).max(10).optional().default(7),
  source: z.enum(['ai', 'fallback']).optional().default('fallback'),
});

const statusSchema = z.object({
  status: z.enum(['idea', 'in-progress', 'completed']),
});

const improveSchema = z.object({
  currentProgress: z.string().trim().max(1000).optional().default(''),
});

const mentorChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
});

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

const planInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  skills: skillsInterests,
});

const abstractInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  domain: z.string().trim().optional().default(''),
});

module.exports = {
  registerSchema,
  loginSchema,
  profileForGeneration,
  saveIdeaSchema,
  statusSchema,
  improveSchema,
  mentorChatSchema,
  rateSchema,
  planInputSchema,
  abstractInputSchema,
};

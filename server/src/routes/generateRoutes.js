/**
 * /api/generate - focused generation endpoints, all protected + AI-limited
 * since each one can trigger an LLM call.
 */
'use strict';

const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const { planInputSchema, abstractInputSchema } = require('../validators/schemas');
const generateController = require('../controllers/generateController');

const router = express.Router();

router.post('/techstack', protect, aiLimiter, validate(planInputSchema), generateController.techstack);
router.post('/timeline', protect, aiLimiter, validate(planInputSchema), generateController.timeline);
router.post('/abstract', protect, aiLimiter, validate(abstractInputSchema), generateController.abstract);
router.post('/features', protect, aiLimiter, validate(planInputSchema), generateController.features);
router.post('/architecture', protect, aiLimiter, validate(planInputSchema), generateController.architecture);

module.exports = router;

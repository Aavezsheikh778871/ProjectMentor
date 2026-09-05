/**
 * /api/projects - generation, saved-project library, details, improvements,
 * status. Every route requires auth except generation, which works
 * anonymously (optionalAuth) so a visitor can try it before signing up but
 * still gets personalised results and usage stats if logged in.
 */
'use strict';

const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const { profileForGeneration, saveIdeaSchema, statusSchema, improveSchema } = require('../validators/schemas');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.post('/generate', optionalAuth, aiLimiter, validate(profileForGeneration), projectController.generate);
router.get('/saved', protect, projectController.listSaved);
router.post('/save/:id', protect, validate(saveIdeaSchema), projectController.saveIdea);
router.delete('/saved/:id', protect, projectController.removeSaved);
router.get('/details/:id', protect, aiLimiter, projectController.getDetails);
router.post('/improve/:id', protect, aiLimiter, validate(improveSchema), projectController.improve);
router.put('/status/:id', protect, validate(statusSchema), projectController.updateStatus);

module.exports = router;

/**
 * /api/mentor - AI mentor chat and conversation history. All protected.
 */
'use strict';

const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const { mentorChatSchema } = require('../validators/schemas');
const mentorController = require('../controllers/mentorController');

const router = express.Router();

router.post('/chat', protect, aiLimiter, validate(mentorChatSchema), mentorController.chat);
router.get('/conversations', protect, mentorController.listConversations);
router.get('/conversation/:id', protect, mentorController.getConversation);
router.delete('/conversation/:id', protect, mentorController.deleteConversation);

module.exports = router;

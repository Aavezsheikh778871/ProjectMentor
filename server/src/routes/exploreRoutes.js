/**
 * /api/explore - public browse endpoints. `optionalAuth` so `rate` can
 * identify a logged-in user while `trending`/`ideas` stay fully anonymous.
 */
'use strict';

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { rateSchema } = require('../validators/schemas');
const exploreController = require('../controllers/exploreController');

const router = express.Router();

router.get('/trending', exploreController.trending);
router.get('/ideas', exploreController.browseIdeas);
router.post('/rate/:id', optionalAuth, validate(rateSchema), exploreController.rate);

module.exports = router;

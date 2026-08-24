const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getBadges } = require('../controllers/badgesController');

router.use(authMiddleware);

router.get('/:userId', getBadges);

module.exports = router;

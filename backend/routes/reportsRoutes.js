const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getReports } = require('../controllers/reportsController');

router.use(authMiddleware);

router.get('/:userId', getReports);

module.exports = router;

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getDashboard, getUpcomingInstallments } = require('../controllers/dashboardController');

router.use(authMiddleware);

router.get('/:userId/upcoming', getUpcomingInstallments);
router.get('/:userId', getDashboard);

module.exports = router;

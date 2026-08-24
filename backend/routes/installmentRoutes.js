const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getInstallments } = require('../controllers/installmentController');

router.use(authMiddleware);

router.get('/:sipId', getInstallments);

module.exports = router;

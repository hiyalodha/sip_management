const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getStocks } = require('../controllers/stockController');

router.use(authMiddleware);
router.get('/', getStocks);

module.exports = router;

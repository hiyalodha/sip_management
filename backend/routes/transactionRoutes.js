const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { payInstallment, getUserTransactions, getReceipt } = require('../controllers/transactionController');

router.use(authMiddleware);

router.post('/pay', payInstallment);
router.get('/user/:userId', getUserTransactions);
router.get('/:id/receipt', getReceipt);

module.exports = router;

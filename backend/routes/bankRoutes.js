const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getUserAccounts, createAccount, deleteAccount } = require('../controllers/bankController');

router.use(authMiddleware);
router.get('/user/:userId', getUserAccounts);
router.post('/create', createAccount);
router.delete('/:id', deleteAccount);

module.exports = router;

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createSip, getUserSips, updateSip, deleteSip } = require('../controllers/sipController');

router.use(authMiddleware);

router.post('/create', createSip);
router.get('/user/:userId', getUserSips);
router.put('/:id', updateSip);
router.delete('/:id', deleteSip);

module.exports = router;

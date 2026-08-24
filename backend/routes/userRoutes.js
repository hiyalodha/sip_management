const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  changePassword,
  addPhone,
  deletePhone,
  sendPhoneOtp,
  verifyPhoneOtp
} = require('../controllers/userController');

router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/phone', addPhone);
router.delete('/phone/:id', deletePhone);
router.post('/phone/:id/send-otp', sendPhoneOtp);
router.post('/phone/:id/verify-otp', verifyPhoneOtp);

module.exports = router;

const bcrypt = require('bcryptjs');
const pool = require('../db');
const { isNonEmptyString } = require('../middleware/validate');

const SALT_ROUNDS = 10;

// In-memory OTP store for the simulated phone verification flow.
// No SMS gateway is configured for this project, so the "sent" code is
// returned directly in the API response instead of being texted out.
// Keyed by Phone_ID -> { code, expiresAt }. Resets on server restart, which
// is fine for a demo/college-project flow.
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// GET /api/user/profile - full profile: user info, phone numbers, bank accounts
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;

    const [userRows] = await pool.query(
      'SELECT User_ID, First_Name, Last_Name, Email_ID, Pan_Number, DOB FROM User WHERE User_ID = ?',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [phones] = await pool.query(
      'SELECT Phone_ID, Phone_Number, Is_Verified FROM User_Phone WHERE User_ID = ?',
      [userId]
    );
    const [accounts] = await pool.query(
      'SELECT Account_ID, Account_No, Bank_Name, IFSC_Code FROM Bank_Account WHERE User_ID = ?',
      [userId]
    );

    res.json({ user: userRows[0], phones, accounts });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// PUT /api/user/profile - update first/last name
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { firstName, lastName } = req.body;

    if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName)) {
      return res.status(400).json({ error: 'First and last name are required' });
    }

    await pool.query('UPDATE User SET First_Name = ?, Last_Name = ? WHERE User_ID = ?', [
      firstName,
      lastName,
      userId
    ]);

    res.json({ message: 'Profile updated', user: { firstName, lastName } });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// PUT /api/user/change-password - requires current password
async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword) || newPassword.length < 6) {
      return res.status(400).json({ error: 'Current password and a new password (min 6 characters) are required' });
    }

    const [rows] = await pool.query('SELECT Password FROM User WHERE User_ID = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].Password);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE User SET Password = ? WHERE User_ID = ?', [hashed, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

// POST /api/user/phone - add a phone number
async function addPhone(req, res) {
  try {
    const userId = req.user.userId;
    const { phoneNumber } = req.body;

    if (!isNonEmptyString(phoneNumber)) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const [result] = await pool.query('INSERT INTO User_Phone (User_ID, Phone_Number) VALUES (?, ?)', [
      userId,
      phoneNumber
    ]);

    res.status(201).json({ message: 'Phone number added', phoneId: result.insertId });
  } catch (err) {
    console.error('Add phone error:', err);
    res.status(500).json({ error: 'Failed to add phone number' });
  }
}

// DELETE /api/user/phone/:id
async function deletePhone(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM User_Phone WHERE Phone_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Phone number not found' });
    }
    if (rows[0].User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this phone number' });
    }

    await pool.query('DELETE FROM User_Phone WHERE Phone_ID = ?', [id]);
    res.json({ message: 'Phone number removed' });
  } catch (err) {
    console.error('Delete phone error:', err);
    res.status(500).json({ error: 'Failed to delete phone number' });
  }
}

// POST /api/user/phone/:id/send-otp - generate a verification code for a phone number
// Simulated: since there's no SMS gateway wired up, the code is returned in the
// response itself so the frontend can display it, instead of being texted to the user.
async function sendPhoneOtp(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM User_Phone WHERE Phone_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Phone number not found' });
    }
    if (rows[0].User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized for this phone number' });
    }
    if (rows[0].Is_Verified) {
      return res.status(400).json({ error: 'This phone number is already verified' });
    }

    const code = generateOtp();
    otpStore.set(Number(id), { code, expiresAt: Date.now() + OTP_TTL_MS });

    res.json({
      message: 'Verification code generated',
      // Simulated delivery — no real SMS service configured for this project.
      simulatedCode: code,
      expiresInSeconds: OTP_TTL_MS / 1000
    });
  } catch (err) {
    console.error('Send phone OTP error:', err);
    res.status(500).json({ error: 'Failed to generate verification code' });
  }
}

// POST /api/user/phone/:id/verify-otp - confirm the code and mark the phone verified
async function verifyPhoneOtp(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { code } = req.body;

    if (!isNonEmptyString(code)) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const [rows] = await pool.query('SELECT * FROM User_Phone WHERE Phone_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Phone number not found' });
    }
    if (rows[0].User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized for this phone number' });
    }

    const entry = otpStore.get(Number(id));
    if (!entry) {
      return res.status(400).json({ error: 'No verification code was requested for this phone number, or it already expired. Request a new one.' });
    }
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(Number(id));
      return res.status(400).json({ error: 'This code has expired. Request a new one.' });
    }
    if (entry.code !== code.trim()) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    await pool.query('UPDATE User_Phone SET Is_Verified = 1 WHERE Phone_ID = ?', [id]);
    otpStore.delete(Number(id));

    res.json({ message: 'Phone number verified' });
  } catch (err) {
    console.error('Verify phone OTP error:', err);
    res.status(500).json({ error: 'Failed to verify phone number' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  addPhone,
  deletePhone,
  sendPhoneOtp,
  verifyPhoneOtp
};

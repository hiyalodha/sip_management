const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('../db');
const { isEmail, isPan, isNonEmptyString, isValidDate } = require('../middleware/validate');
const { checkLock, recordFailure, recordSuccess } = require('../services/loginAttemptTracker');

const SALT_ROUNDS = 10;

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { firstName, lastName, email, panNumber, dob, password, phone } = req.body;

    if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName)) {
      return res.status(400).json({ error: 'First and last name are required' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!isPan(panNumber)) {
      return res.status(400).json({ error: 'Valid PAN number is required (e.g. ABCDE1234F)' });
    }
    if (!isValidDate(dob)) {
      return res.status(400).json({ error: 'Valid date of birth is required' });
    }
    if (!isNonEmptyString(password) || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [existing] = await pool.query(
      'SELECT User_ID FROM User WHERE Email_ID = ? OR Pan_Number = ?',
      [email, panNumber.toUpperCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User with this email or PAN already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO User (First_Name, Last_Name, Email_ID, Pan_Number, DOB, Password)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, panNumber.toUpperCase(), dob, hashedPassword]
    );

    const userId = result.insertId;

    if (phone && isNonEmptyString(phone)) {
      await pool.query('INSERT INTO User_Phone (User_ID, Phone_Number) VALUES (?, ?)', [userId, phone]);
    }

    const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: { userId, firstName, lastName, email }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to sign up' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!isEmail(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const lock = checkLock(email);
    if (lock.locked) {
      const minutes = Math.ceil(lock.retryAfterSeconds / 60);
      return res.status(429).json({
        error: `Too many failed login attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
      });
    }

    const [rows] = await pool.query('SELECT * FROM User WHERE Email_ID = ?', [email]);
    if (rows.length === 0) {
      recordFailure(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      const attemptsLeft = recordFailure(email);
      return res.status(401).json({
        error: attemptsLeft > 0
          ? `Invalid email or password. ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} left before your account is temporarily locked.`
          : 'Invalid email or password. Too many failed attempts — your account is now temporarily locked.'
      });
    }

    recordSuccess(email);

    const token = jwt.sign(
      { userId: user.User_ID, email: user.Email_ID },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.User_ID,
        firstName: user.First_Name,
        lastName: user.Last_Name,
        email: user.Email_ID
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
}

// POST /api/auth/reset-password
// Identity is verified with email + PAN number (both unique to a user) since
// this project has no email/SMS service to send a reset link/OTP through.
async function resetPassword(req, res) {
  try {
    const { email, panNumber, newPassword } = req.body;

    if (!isEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!isPan(panNumber)) {
      return res.status(400).json({ error: 'Valid PAN number is required (e.g. ABCDE1234F)' });
    }
    if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const [rows] = await pool.query(
      'SELECT User_ID FROM User WHERE Email_ID = ? AND Pan_Number = ?',
      [email, panNumber.toUpperCase()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found matching that email and PAN number' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE User SET Password = ? WHERE User_ID = ?', [hashedPassword, rows[0].User_ID]);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

module.exports = { signup, login, resetPassword };

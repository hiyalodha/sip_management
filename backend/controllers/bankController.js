const pool = require('../db');
const { isNonEmptyString } = require('../middleware/validate');

// GET /api/bank/user/:userId - list a user's bank accounts (needed to pay installments)
async function getUserAccounts(req, res) {
  try {
    const { userId } = req.params;
    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const [rows] = await pool.query('SELECT * FROM Bank_Account WHERE User_ID = ?', [userId]);
    res.json({ accounts: rows });
  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
}

// POST /api/bank/create - add a bank account for the logged-in user
async function createAccount(req, res) {
  try {
    const userId = req.user.userId;
    const { accountNo, bankName, ifscCode } = req.body;

    if (!isNonEmptyString(accountNo) || !isNonEmptyString(bankName) || !isNonEmptyString(ifscCode)) {
      return res.status(400).json({ error: 'accountNo, bankName and ifscCode are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO Bank_Account (User_ID, Account_No, Bank_Name, IFSC_Code) VALUES (?, ?, ?, ?)',
      [userId, accountNo, bankName, ifscCode.toUpperCase()]
    );

    res.status(201).json({ message: 'Bank account added', accountId: result.insertId });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ error: 'Failed to add bank account' });
  }
}

// DELETE /api/bank/:id - remove a bank account belonging to the logged-in user
async function deleteAccount(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM Bank_Account WHERE Account_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    if (rows[0].User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this account' });
    }

    await pool.query('DELETE FROM Bank_Account WHERE Account_ID = ?', [id]);
    res.json({ message: 'Bank account removed' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
}

module.exports = { getUserAccounts, createAccount, deleteAccount };

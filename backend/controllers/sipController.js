const pool = require('../db');
const { isPositiveNumber, isValidDate } = require('../middleware/validate');

// Generates installment due dates based on frequency.
// Monthly -> 12 installments (1 year), Quarterly -> 4 installments (1 year)
function generateInstallmentDates(startDate, frequency) {
  const dates = [];
  const count = frequency === 'Quarterly' ? 4 : 12;
  const stepMonths = frequency === 'Quarterly' ? 3 : 1;

  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + stepMonths * i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// POST /api/sip/create
async function createSip(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { stockId, amount, frequency, startDate, roundUpEnabled } = req.body;

    if (!isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (!['Monthly', 'Quarterly'].includes(frequency)) {
      return res.status(400).json({ error: 'Frequency must be Monthly or Quarterly' });
    }
    if (!isValidDate(startDate)) {
      return res.status(400).json({ error: 'Valid start date is required' });
    }
    if (!stockId) {
      return res.status(400).json({ error: 'stockId is required' });
    }

    const [stockRows] = await conn.query('SELECT Stock_ID FROM Stock WHERE Stock_ID = ?', [stockId]);
    if (stockRows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    await conn.beginTransaction();

    const [sipResult] = await conn.query(
      `INSERT INTO SIP_Plan (User_ID, Stock_ID, Amount, Frequency, Start_Date, Status, Round_Up_Enabled)
       VALUES (?, ?, ?, ?, ?, 'Active', ?)`,
      [userId, stockId, amount, frequency, startDate, roundUpEnabled ? 1 : 0]
    );
    const sipId = sipResult.insertId;

    // Auto-generate installments
    const dueDates = generateInstallmentDates(startDate, frequency);
    const values = dueDates.map((date) => [sipId, date, amount, 'Pending']);
    await conn.query(
      'INSERT INTO Installments (SIP_ID, Due_Date, Amount, Status) VALUES ?',
      [values]
    );

    await conn.commit();

    res.status(201).json({
      message: 'SIP created and installments generated',
      sipId,
      installmentsGenerated: dueDates.length
    });
  } catch (err) {
    await conn.rollback();
    console.error('Create SIP error:', err);
    res.status(500).json({ error: 'Failed to create SIP' });
  } finally {
    conn.release();
  }
}

// GET /api/sip/user/:userId
async function getUserSips(req, res) {
  try {
    const { userId } = req.params;

    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these SIPs' });
    }

    const [rows] = await pool.query(
      `SELECT sp.SIP_ID, sp.Amount, sp.Frequency, sp.Start_Date, sp.Status, sp.Goal_ID, sp.Round_Up_Enabled,
              s.Stock_Name, s.Ticker_Symbol, s.Sector, s.Current_Price,
              g.Goal_Name
       FROM SIP_Plan sp
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       LEFT JOIN Goal g ON sp.Goal_ID = g.Goal_ID
       WHERE sp.User_ID = ?
       ORDER BY sp.SIP_ID DESC`,
      [userId]
    );

    res.json({ sips: rows });
  } catch (err) {
    console.error('Get user SIPs error:', err);
    res.status(500).json({ error: 'Failed to fetch SIPs' });
  }
}

// PUT /api/sip/:id
async function updateSip(req, res) {
  try {
    const { id } = req.params;
    const { status, amount, roundUpEnabled } = req.body;

    const [rows] = await pool.query('SELECT * FROM SIP_Plan WHERE SIP_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'SIP not found' });
    }
    if (rows[0].User_ID !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to modify this SIP' });
    }

    const validStatuses = ['Active', 'Paused', 'Cancelled', 'Completed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    if (amount && !isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    await pool.query(
      `UPDATE SIP_Plan
       SET Status = COALESCE(?, Status),
           Amount = COALESCE(?, Amount),
           Round_Up_Enabled = COALESCE(?, Round_Up_Enabled)
       WHERE SIP_ID = ?`,
      [status || null, amount || null, typeof roundUpEnabled === 'boolean' ? (roundUpEnabled ? 1 : 0) : null, id]
    );

    res.json({ message: 'SIP updated successfully' });
  } catch (err) {
    console.error('Update SIP error:', err);
    res.status(500).json({ error: 'Failed to update SIP' });
  }
}

// DELETE /api/sip/:id
async function deleteSip(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM SIP_Plan WHERE SIP_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'SIP not found' });
    }
    if (rows[0].User_ID !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this SIP' });
    }

    await pool.query('DELETE FROM SIP_Plan WHERE SIP_ID = ?', [id]); // cascades to Installments/Transactions

    res.json({ message: 'SIP deleted successfully' });
  } catch (err) {
    console.error('Delete SIP error:', err);
    res.status(500).json({ error: 'Failed to delete SIP' });
  }
}

module.exports = { createSip, getUserSips, updateSip, deleteSip };

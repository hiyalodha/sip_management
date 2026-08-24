const pool = require('../db');

// GET /api/installments/:sipId
async function getInstallments(req, res) {
  try {
    const { sipId } = req.params;

    const [sipRows] = await pool.query('SELECT * FROM SIP_Plan WHERE SIP_ID = ?', [sipId]);
    if (sipRows.length === 0) {
      return res.status(404).json({ error: 'SIP not found' });
    }
    if (sipRows[0].User_ID !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these installments' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM Installments WHERE SIP_ID = ? ORDER BY Due_Date ASC',
      [sipId]
    );

    res.json({ installments: rows, sipStatus: sipRows[0].Status });
  } catch (err) {
    console.error('Get installments error:', err);
    res.status(500).json({ error: 'Failed to fetch installments' });
  }
}

module.exports = { getInstallments };

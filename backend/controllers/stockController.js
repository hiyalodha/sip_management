const pool = require('../db');

// GET /api/stocks - list all stocks (needed by frontend to build the SIP creation form)
async function getStocks(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM Stock ORDER BY Stock_Name ASC');
    res.json({ stocks: rows });
  } catch (err) {
    console.error('Get stocks error:', err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
}

module.exports = { getStocks };

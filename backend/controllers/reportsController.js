const pool = require('../db');

// GET /api/reports/:userId - aggregate analytics for a user's investments.
// Everything here is deliberately built with GROUP BY / aggregate SQL rather
// than being computed in JS, since that's the point of the report.
async function getReports(req, res) {
  try {
    const { userId } = req.params;

    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these reports' });
    }

    // Investment total broken down by stock sector
    const [bySector] = await pool.query(
      `SELECT s.Sector AS label, SUM(st.Amount) AS total
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       WHERE sp.User_ID = ? AND st.Status = 'Success'
       GROUP BY s.Sector
       ORDER BY total DESC`,
      [userId]
    );

    // Investment total broken down by stock risk level
    const [byRisk] = await pool.query(
      `SELECT s.Risk_Level AS label, SUM(st.Amount) AS total
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       WHERE sp.User_ID = ? AND st.Status = 'Success'
       GROUP BY s.Risk_Level
       ORDER BY FIELD(s.Risk_Level, 'Low', 'Medium', 'High')`,
      [userId]
    );

    // Monthly investment trend (last 12 months of activity)
    const [monthlyTrend] = await pool.query(
      `SELECT DATE_FORMAT(st.Transaction_Date, '%Y-%m') AS month, SUM(st.Amount) AS total
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       WHERE sp.User_ID = ? AND st.Status = 'Success'
       GROUP BY month
       ORDER BY month ASC
       LIMIT 12`,
      [userId]
    );

    // SIP count by status
    const [sipStatusBreakdown] = await pool.query(
      `SELECT Status AS label, COUNT(*) AS count
       FROM SIP_Plan
       WHERE User_ID = ?
       GROUP BY Status`,
      [userId]
    );

    // Single most-invested-in stock
    const [topStockRows] = await pool.query(
      `SELECT s.Stock_Name, s.Ticker_Symbol, SUM(st.Amount) AS total
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       WHERE sp.User_ID = ? AND st.Status = 'Success'
       GROUP BY s.Stock_ID
       ORDER BY total DESC
       LIMIT 1`,
      [userId]
    );

    // Daily payment activity for the streak heatmap (last ~180 days)
    const [dailyActivityRows] = await pool.query(
      `SELECT DATE(st.Transaction_Date) AS date, SUM(st.Amount) AS total, COUNT(*) AS count
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       WHERE sp.User_ID = ? AND st.Status = 'Success'
         AND st.Transaction_Date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
       GROUP BY DATE(st.Transaction_Date)
       ORDER BY date ASC`,
      [userId]
    );

    // All months with at least one successful payment (used to compute streaks)
    const [activeMonthRows] = await pool.query(
      `SELECT DISTINCT DATE_FORMAT(st.Transaction_Date, '%Y-%m') AS month
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       WHERE sp.User_ID = ? AND st.Status = 'Success'
       ORDER BY month ASC`,
      [userId]
    );

    const activeMonths = new Set(activeMonthRows.map((r) => r.month));

    function monthKey(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    // Current streak: walk backward from this month while each month has a payment.
    // The current (in-progress) month is skipped if it has no payment yet, so an
    // active streak isn't broken just because this month's installment isn't due yet.
    let currentStreakMonths = 0;
    let cursor = new Date();
    if (!activeMonths.has(monthKey(cursor))) {
      cursor.setMonth(cursor.getMonth() - 1);
    }
    while (activeMonths.has(monthKey(cursor))) {
      currentStreakMonths++;
      cursor.setMonth(cursor.getMonth() - 1);
    }

    // Longest streak: scan the sorted list of active months for the longest
    // run of calendar-consecutive months.
    const sortedMonths = [...activeMonths].sort();
    let longestStreakMonths = 0;
    let run = 0;
    let prevMonth = null;
    for (const m of sortedMonths) {
      if (prevMonth) {
        const [py, pm] = prevMonth.split('-').map(Number);
        const expectedNext = pm === 12 ? `${py + 1}-01` : `${py}-${String(pm + 1).padStart(2, '0')}`;
        run = m === expectedNext ? run + 1 : 1;
      } else {
        run = 1;
      }
      longestStreakMonths = Math.max(longestStreakMonths, run);
      prevMonth = m;
    }

    res.json({
      bySector: bySector.map((r) => ({ label: r.label || 'Unspecified', total: Number(r.total) })),
      byRisk: byRisk.map((r) => ({ label: r.label, total: Number(r.total) })),
      monthlyTrend: monthlyTrend.map((r) => ({ month: r.month, total: Number(r.total) })),
      sipStatusBreakdown: sipStatusBreakdown.map((r) => ({ label: r.label, count: Number(r.count) })),
      topStock: topStockRows[0]
        ? { name: topStockRows[0].Stock_Name, ticker: topStockRows[0].Ticker_Symbol, total: Number(topStockRows[0].total) }
        : null,
      dailyActivity: dailyActivityRows.map((r) => ({ date: r.date, total: Number(r.total), count: Number(r.count) })),
      currentStreakMonths,
      longestStreakMonths
    });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
}

module.exports = { getReports };

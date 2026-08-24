const pool = require('../db');

// GET /api/dashboard/:userId
async function getDashboard(req, res) {
  try {
    const { userId } = req.params;

    // Make sure the logged-in user can only access their own dashboard
    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({
        error: 'Not authorized to view this dashboard'
      });
    }

    // 1. Total amount successfully invested
    const [[{ totalInvested }]] = await pool.query(
      `SELECT COALESCE(SUM(st.Amount), 0) AS totalInvested
       FROM SIP_Transaction st
       JOIN SIP_Plan sp
         ON st.SIP_ID = sp.SIP_ID
       WHERE sp.User_ID = ?
         AND st.Status = 'Success'`,
      [userId]
    );

    // 2. Number of active SIPs
    const [[{ activeSips }]] = await pool.query(
      `SELECT COUNT(*) AS activeSips
       FROM SIP_Plan
       WHERE User_ID = ?
         AND Status = 'Active'`,
      [userId]
    );

    // 3. Number of installments that are actually due (Due_Date has arrived or
    //    passed) and still unpaid. Installments scheduled for future months
    //    are intentionally excluded — they're not due yet, so they shouldn't
    //    be counted as something the user needs to act on.
    const [[{ pendingInstallments }]] = await pool.query(
      `SELECT COUNT(*) AS pendingInstallments
       FROM Installments i
       JOIN SIP_Plan sp
         ON i.SIP_ID = sp.SIP_ID
       WHERE sp.User_ID = ?
         AND i.Status IN ('Pending', 'Overdue')
         AND i.Due_Date <= CURDATE()`,
      [userId]
    );

    // 4. Number of overdue installments specifically
    const [[{ overdueInstallments }]] = await pool.query(
      `SELECT COUNT(*) AS overdueInstallments
       FROM Installments i
       JOIN SIP_Plan sp
         ON i.SIP_ID = sp.SIP_ID
       WHERE sp.User_ID = ?
         AND i.Status = 'Overdue'`,
      [userId]
    );

    res.json({
      totalInvested: Number(totalInvested),
      activeSips: Number(activeSips),
      pendingInstallments: Number(pendingInstallments),
      overdueInstallments: Number(overdueInstallments)
    });

  } catch (err) {
    console.error('Dashboard error:', err);

    res.status(500).json({
      error: 'Failed to load dashboard'
    });
  }
}

// GET /api/dashboard/:userId/upcoming - installments due within the next 30
// days (plus anything already overdue), across all active SIPs, for the
// "Upcoming payments" widget on the dashboard.
async function getUpcomingInstallments(req, res) {
  try {
    const { userId } = req.params;

    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view this dashboard' });
    }

    const [rows] = await pool.query(
      `SELECT i.Inst_ID, i.SIP_ID, i.Due_Date, i.Amount, i.Status,
              s.Stock_Name, s.Ticker_Symbol,
              DATEDIFF(i.Due_Date, CURDATE()) AS DaysUntilDue
       FROM Installments i
       JOIN SIP_Plan sp ON i.SIP_ID = sp.SIP_ID
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       WHERE sp.User_ID = ?
         AND sp.Status = 'Active'
         AND i.Status IN ('Pending', 'Overdue')
         AND i.Due_Date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY i.Due_Date ASC
       LIMIT 10`,
      [userId]
    );

    res.json({
      upcoming: rows.map((r) => ({
        instId: r.Inst_ID,
        sipId: r.SIP_ID,
        dueDate: r.Due_Date,
        amount: Number(r.Amount),
        status: r.Status,
        stockName: r.Stock_Name,
        ticker: r.Ticker_Symbol,
        daysUntilDue: Number(r.DaysUntilDue)
      }))
    });
  } catch (err) {
    console.error('Get upcoming installments error:', err);
    res.status(500).json({ error: 'Failed to load upcoming payments' });
  }
}

module.exports = { getDashboard, getUpcomingInstallments };
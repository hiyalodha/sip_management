const pool = require('../db');

// Badge definitions live here so both the "earned" check and the display
// metadata (icon/label/description) stay in one place.
const BADGE_DEFS = [
  {
    key: 'first_sip',
    label: 'First SIP',
    icon: '🌱',
    description: 'Started your very first SIP.'
  },
  {
    key: 'committed_investor',
    label: 'Committed Investor',
    icon: '💪',
    description: 'Made 5 or more successful payments.'
  },
  {
    key: 'perfect_payer',
    label: 'Perfect Payer',
    icon: '🔥',
    description: 'Currently on a 3+ month payment streak.'
  },
  {
    key: 'marathoner',
    label: 'Marathoner',
    icon: '🏅',
    description: 'Hit a 6+ month payment streak at some point.'
  },
  {
    key: 'diversified',
    label: 'Diversified',
    icon: '🧩',
    description: 'Invested across 3 or more different sectors.'
  },
  {
    key: 'goal_crusher',
    label: 'Goal Crusher',
    icon: '🎯',
    description: 'Fully funded at least one savings goal.'
  },
  {
    key: 'big_saver',
    label: 'Big Saver',
    icon: '💰',
    description: 'Crossed ₹50,000 in total successful investments.'
  }
];

// GET /api/badges/:userId
async function getBadges(req, res) {
  try {
    const { userId } = req.params;

    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these badges' });
    }

    const [[sipStats]] = await pool.query(
      `SELECT COUNT(*) AS sipCount FROM SIP_Plan WHERE User_ID = ?`,
      [userId]
    );

    const [[paymentStats]] = await pool.query(
      `SELECT COUNT(*) AS paymentCount, COALESCE(SUM(st.Amount), 0) AS totalInvested
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       WHERE sp.User_ID = ? AND st.Status = 'Success'`,
      [userId]
    );

    const [[sectorStats]] = await pool.query(
      `SELECT COUNT(DISTINCT s.Sector) AS sectorCount
       FROM SIP_Plan sp
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       WHERE sp.User_ID = ?`,
      [userId]
    );

    const [[goalStats]] = await pool.query(
      `SELECT COUNT(*) AS achievedGoals
       FROM Goal g
       WHERE g.User_ID = ?
         AND g.Target_Amount <= (
           SELECT COALESCE(SUM(st.Amount), 0)
           FROM SIP_Plan sp
           JOIN SIP_Transaction st ON st.SIP_ID = sp.SIP_ID
           WHERE sp.Goal_ID = g.Goal_ID AND st.Status = 'Success'
         )`,
      [userId]
    );

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

    let currentStreakMonths = 0;
    let cursor = new Date();
    if (!activeMonths.has(monthKey(cursor))) {
      cursor.setMonth(cursor.getMonth() - 1);
    }
    while (activeMonths.has(monthKey(cursor))) {
      currentStreakMonths++;
      cursor.setMonth(cursor.getMonth() - 1);
    }

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

    const earned = {
      first_sip: sipStats.sipCount >= 1,
      committed_investor: paymentStats.paymentCount >= 5,
      perfect_payer: currentStreakMonths >= 3,
      marathoner: longestStreakMonths >= 6,
      diversified: sectorStats.sectorCount >= 3,
      goal_crusher: goalStats.achievedGoals >= 1,
      big_saver: Number(paymentStats.totalInvested) >= 50000
    };

    const badges = BADGE_DEFS.map((b) => ({ ...b, earned: !!earned[b.key] }));

    res.json({
      badges,
      earnedCount: badges.filter((b) => b.earned).length,
      totalCount: badges.length
    });
  } catch (err) {
    console.error('Get badges error:', err);
    res.status(500).json({ error: 'Failed to load badges' });
  }
}

module.exports = { getBadges };

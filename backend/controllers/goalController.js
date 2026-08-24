const pool = require('../db');
const { isNonEmptyString, isPositiveNumber } = require('../middleware/validate');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function ensureInviteCode(conn, goalId) {
  let code = generateInviteCode();
  // Extremely unlikely to collide, but guard against it anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await conn.query('UPDATE Goal SET Invite_Code = ? WHERE Goal_ID = ?', [code, goalId]);
      return code;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        code = generateInviteCode();
        continue;
      }
      throw err;
    }
  }
  return code;
}

// Is this user allowed to see/use this goal — either the owner or a joined member?
async function userHasGoalAccess(conn, goalId, userId) {
  const [goalRows] = await conn.query('SELECT * FROM Goal WHERE Goal_ID = ?', [goalId]);
  if (goalRows.length === 0) return { goal: null, allowed: false };
  const goal = goalRows[0];
  if (goal.User_ID === userId) return { goal, allowed: true, isOwner: true };
  const [memberRows] = await conn.query(
    'SELECT 1 FROM Goal_Member WHERE Goal_ID = ? AND User_ID = ?',
    [goalId, userId]
  );
  return { goal, allowed: memberRows.length > 0, isOwner: false };
}

// GET /api/goals/user/:userId - all goals the user owns or has joined, with computed progress
async function getUserGoals(req, res) {
  try {
    const { userId } = req.params;
    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these goals' });
    }

    const [goals] = await pool.query(
      `SELECT g.*,
              COALESCE(SUM(CASE WHEN st.Status = 'Success' THEN st.Amount + st.Round_Up_Amount ELSE 0 END), 0) AS Invested,
              COALESCE(SUM(CASE WHEN st.Status = 'Success' THEN st.Round_Up_Amount ELSE 0 END), 0) AS RoundUpTotal,
              COUNT(DISTINCT sp.SIP_ID) AS LinkedSips,
              (g.User_ID = ?) AS IsOwner,
              (SELECT COUNT(*) FROM Goal_Member gm WHERE gm.Goal_ID = g.Goal_ID) AS MemberCount
       FROM Goal g
       LEFT JOIN SIP_Plan sp ON sp.Goal_ID = g.Goal_ID
       LEFT JOIN SIP_Transaction st ON st.SIP_ID = sp.SIP_ID
       WHERE g.User_ID = ? OR g.Goal_ID IN (SELECT Goal_ID FROM Goal_Member WHERE User_ID = ?)
       GROUP BY g.Goal_ID
       ORDER BY g.Created_At DESC`,
      [userId, userId, userId]
    );

    // Older goals may not have an invite code yet — backfill lazily.
    for (const g of goals) {
      if (!g.Invite_Code) {
        g.Invite_Code = await ensureInviteCode(pool, g.Goal_ID);
      }
    }

    const shaped = goals.map((g) => ({
      ...g,
      Invested: Number(g.Invested),
      RoundUpTotal: Number(g.RoundUpTotal),
      Target_Amount: Number(g.Target_Amount),
      Achieved: Number(g.Invested) >= Number(g.Target_Amount),
      IsOwner: !!g.IsOwner,
      MemberCount: Number(g.MemberCount)
    }));

    res.json({ goals: shaped });
  } catch (err) {
    console.error('Get goals error:', err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
}

// GET /api/goals/:id/sips - SIPs linked to a specific goal (owner or member only)
async function getGoalSips(req, res) {
  try {
    const { id } = req.params;
    const { allowed } = await userHasGoalAccess(pool, id, req.user.userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to view this goal' });
    }

    const [sips] = await pool.query(
      `SELECT sp.SIP_ID, sp.Amount, sp.Frequency, sp.Status, s.Stock_Name, s.Ticker_Symbol,
              u.First_Name, u.Last_Name, sp.User_ID
       FROM SIP_Plan sp
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       JOIN User u ON sp.User_ID = u.User_ID
       WHERE sp.Goal_ID = ?`,
      [id]
    );

    res.json({ sips });
  } catch (err) {
    console.error('Get goal SIPs error:', err);
    res.status(500).json({ error: 'Failed to fetch SIPs for this goal' });
  }
}

// GET /api/goals/:id/contributors - per-person contribution breakdown for a shared goal
async function getGoalContributors(req, res) {
  try {
    const { id } = req.params;
    const { allowed } = await userHasGoalAccess(pool, id, req.user.userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to view this goal' });
    }

    const [rows] = await pool.query(
      `SELECT u.User_ID, u.First_Name, u.Last_Name,
              COALESCE(SUM(st.Amount + st.Round_Up_Amount), 0) AS Contributed
       FROM SIP_Plan sp
       JOIN User u ON sp.User_ID = u.User_ID
       LEFT JOIN SIP_Transaction st ON st.SIP_ID = sp.SIP_ID AND st.Status = 'Success'
       WHERE sp.Goal_ID = ?
       GROUP BY u.User_ID
       ORDER BY Contributed DESC`,
      [id]
    );

    res.json({
      contributors: rows.map((r) => ({
        userId: r.User_ID,
        name: `${r.First_Name} ${r.Last_Name}`,
        contributed: Number(r.Contributed)
      }))
    });
  } catch (err) {
    console.error('Get goal contributors error:', err);
    res.status(500).json({ error: 'Failed to fetch contributors' });
  }
}

// POST /api/goals/create
async function createGoal(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { goalName, targetAmount, targetDate } = req.body;

    if (!isNonEmptyString(goalName)) {
      return res.status(400).json({ error: 'Goal name is required' });
    }
    if (!isPositiveNumber(targetAmount)) {
      return res.status(400).json({ error: 'Target amount must be a positive number' });
    }

    const [result] = await conn.query(
      'INSERT INTO Goal (User_ID, Goal_Name, Target_Amount, Target_Date) VALUES (?, ?, ?, ?)',
      [userId, goalName, targetAmount, targetDate || null]
    );
    const inviteCode = await ensureInviteCode(conn, result.insertId);

    res.status(201).json({ message: 'Goal created', goalId: result.insertId, inviteCode });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ error: 'Failed to create goal' });
  } finally {
    conn.release();
  }
}

// POST /api/goals/join - { inviteCode } — join a friend's shared goal
async function joinGoal(req, res) {
  try {
    const userId = req.user.userId;
    const { inviteCode } = req.body;

    if (!isNonEmptyString(inviteCode)) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const [goalRows] = await pool.query('SELECT * FROM Goal WHERE Invite_Code = ?', [inviteCode.trim().toUpperCase()]);
    if (goalRows.length === 0) {
      return res.status(404).json({ error: 'No goal found with that invite code' });
    }
    const goal = goalRows[0];

    if (goal.User_ID === userId) {
      return res.status(400).json({ error: "You already own this goal — no need to join it." });
    }

    const [existing] = await pool.query(
      'SELECT 1 FROM Goal_Member WHERE Goal_ID = ? AND User_ID = ?',
      [goal.Goal_ID, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "You've already joined this goal." });
    }

    await pool.query('INSERT INTO Goal_Member (Goal_ID, User_ID) VALUES (?, ?)', [goal.Goal_ID, userId]);
    res.status(201).json({ message: `Joined "${goal.Goal_Name}"`, goalId: goal.Goal_ID });
  } catch (err) {
    console.error('Join goal error:', err);
    res.status(500).json({ error: 'Failed to join goal' });
  }
}

// DELETE /api/goals/:id/leave - a member leaves a shared goal (owner cannot leave, must delete instead)
async function leaveGoal(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [goalRows] = await pool.query('SELECT * FROM Goal WHERE Goal_ID = ?', [id]);
    if (goalRows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    if (goalRows[0].User_ID === userId) {
      return res.status(400).json({ error: 'Owners cannot leave their own goal — delete it instead.' });
    }

    await pool.query('DELETE FROM Goal_Member WHERE Goal_ID = ? AND User_ID = ?', [id, userId]);
    // Unlink any of this member's SIPs from the goal they just left
    await pool.query('UPDATE SIP_Plan SET Goal_ID = NULL WHERE Goal_ID = ? AND User_ID = ?', [id, userId]);
    res.json({ message: 'Left the goal' });
  } catch (err) {
    console.error('Leave goal error:', err);
    res.status(500).json({ error: 'Failed to leave goal' });
  }
}

// DELETE /api/goals/:id - linked SIPs are kept, just unlinked (ON DELETE SET NULL). Owner only.
async function deleteGoal(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM Goal WHERE Goal_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    if (rows[0].User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this goal' });
    }

    await pool.query('DELETE FROM Goal WHERE Goal_ID = ?', [id]);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
}

// PUT /api/goals/link - { sipId, goalId } — pass goalId: null to unlink.
// Linking requires the user to own the SIP and have access to the goal
// (either as owner or as a joined member), so friends can contribute their
// own SIPs to a shared goal.
async function linkSip(req, res) {
  try {
    const userId = req.user.userId;
    const { sipId, goalId } = req.body;

    if (!sipId) {
      return res.status(400).json({ error: 'sipId is required' });
    }

    const [sipRows] = await pool.query('SELECT * FROM SIP_Plan WHERE SIP_ID = ?', [sipId]);
    if (sipRows.length === 0) {
      return res.status(404).json({ error: 'SIP not found' });
    }
    if (sipRows[0].User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this SIP' });
    }

    if (goalId) {
      const { allowed } = await userHasGoalAccess(pool, goalId, userId);
      if (!allowed) {
        return res.status(403).json({ error: 'Not authorized to use this goal — join it with an invite code first.' });
      }
    }

    await pool.query('UPDATE SIP_Plan SET Goal_ID = ? WHERE SIP_ID = ?', [goalId || null, sipId]);
    res.json({ message: goalId ? 'SIP linked to goal' : 'SIP unlinked from goal' });
  } catch (err) {
    console.error('Link SIP to goal error:', err);
    res.status(500).json({ error: 'Failed to update SIP-goal link' });
  }
}

module.exports = {
  getUserGoals,
  getGoalSips,
  getGoalContributors,
  createGoal,
  joinGoal,
  leaveGoal,
  deleteGoal,
  linkSip
};

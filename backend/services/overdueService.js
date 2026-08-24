const cron = require('node-cron');
const pool = require('../db');

// Flips any Installment still marked 'Pending' whose Due_Date has passed
// into 'Overdue'. This is what actually makes the Overdue status in the
// schema mean something, instead of it sitting unused.
async function markOverdueInstallments() {
  try {
    const [result] = await pool.query(
      `UPDATE Installments
       SET Status = 'Overdue'
       WHERE Status = 'Pending' AND Due_Date < CURDATE()`
    );
    if (result.affectedRows > 0) {
      console.log(`Marked ${result.affectedRows} installment(s) as Overdue.`);
    }
  } catch (err) {
    console.error('Overdue status job failed:', err.message);
  }
}

// Runs once immediately (so status is correct right after a restart), then
// re-checks every hour. Cheap query — indexed columns, small table for a
// project like this — so hourly is more than enough without being wasteful.
function startOverdueScheduler() {
  markOverdueInstallments();
  cron.schedule('0 * * * *', markOverdueInstallments);
  console.log('Overdue installment scheduler started (runs hourly).');
}

module.exports = { startOverdueScheduler, markOverdueInstallments };

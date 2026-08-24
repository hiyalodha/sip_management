const pool = require('../db');
const PDFDocument = require('pdfkit');
const { isPositiveNumber } = require('../middleware/validate');

// POST /api/transaction/pay
// Body: { installmentId, accountId }
async function payInstallment(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { installmentId, accountId } = req.body;

    if (!installmentId || !accountId) {
      return res.status(400).json({ error: 'installmentId and accountId are required' });
    }

    const [instRows] = await conn.query(
      `SELECT i.*, sp.User_ID, sp.Status AS SipStatus, sp.Round_Up_Enabled, sp.Goal_ID, g.Goal_Name, CURDATE() AS Today
       FROM Installments i
       JOIN SIP_Plan sp ON i.SIP_ID = sp.SIP_ID
       LEFT JOIN Goal g ON sp.Goal_ID = g.Goal_ID
       WHERE i.Inst_ID = ?`,
      [installmentId]
    );
    if (instRows.length === 0) {
      return res.status(404).json({ error: 'Installment not found' });
    }
    const installment = instRows[0];

    if (installment.User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized to pay this installment' });
    }
    if (installment.Status === 'Paid') {
      return res.status(400).json({ error: 'Installment already paid' });
    }
    if (installment.SipStatus === 'Paused') {
      return res.status(400).json({ error: 'This SIP is paused. Resume it before paying installments.' });
    }
    if (installment.SipStatus === 'Cancelled') {
      return res.status(400).json({ error: 'This SIP is cancelled. Installments can no longer be paid.' });
    }
    // Block payment for installments that aren't due yet (Due_Date is in the future)
    if (installment.Due_Date > installment.Today) {
      return res.status(400).json({ error: 'This installment is not due yet. You can only pay installments due today or earlier.' });
    }

    const [acctRows] = await conn.query(
      'SELECT * FROM Bank_Account WHERE Account_ID = ? AND User_ID = ?',
      [accountId, userId]
    );
    if (acctRows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found for this user' });
    }

    const amount = installment.Amount;
    if (!isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'Invalid installment amount' });
    }

    // Round-up savings: if enabled on this SIP and it's linked to a goal, round the
    // payment up to the nearest ₹50 and credit the difference toward that goal.
    const ROUND_INCREMENT = 50;
    let roundUpAmount = 0;
    if (installment.Round_Up_Enabled && installment.Goal_ID) {
      const roundedTotal = Math.ceil(amount / ROUND_INCREMENT) * ROUND_INCREMENT;
      roundUpAmount = Math.round((roundedTotal - amount) * 100) / 100;
    }

    await conn.beginTransaction();

    const [txnResult] = await conn.query(
      `INSERT INTO SIP_Transaction (SIP_ID, Installment_ID, Account_ID, Amount, Status, Round_Up_Amount)
       VALUES (?, ?, ?, ?, 'Success', ?)`,
      [installment.SIP_ID, installmentId, accountId, amount, roundUpAmount]
    );

    await conn.query(
      `UPDATE Installments SET Status = 'Paid', Paid_Date = CURDATE() WHERE Inst_ID = ?`,
      [installmentId]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Payment successful',
      transactionId: txnResult.insertId,
      roundUpAmount,
      goalName: roundUpAmount > 0 ? installment.Goal_Name : null
    });
  } catch (err) {
    await conn.rollback();
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  } finally {
    conn.release();
  }
}

// GET /api/transaction/user/:userId - full transaction history across all of a user's SIPs
async function getUserTransactions(req, res) {
  try {
    const { userId } = req.params;

    if (parseInt(userId, 10) !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these transactions' });
    }

    const [rows] = await pool.query(
      `SELECT st.Transaction_ID, st.Amount, st.Round_Up_Amount, st.Transaction_Date, st.Status,
              sp.SIP_ID, s.Stock_Name, s.Ticker_Symbol,
              i.Due_Date, ba.Bank_Name, ba.Account_No
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       JOIN Installments i ON st.Installment_ID = i.Inst_ID
       JOIN Bank_Account ba ON st.Account_ID = ba.Account_ID
       WHERE sp.User_ID = ?
       ORDER BY st.Transaction_Date DESC`,
      [userId]
    );

    res.json({ transactions: rows });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
}

// GET /api/transaction/:id/receipt - streams a PDF receipt for one successful payment
async function getReceipt(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT st.Transaction_ID, st.Amount, st.Round_Up_Amount, st.Transaction_Date, st.Status,
              sp.SIP_ID, sp.Frequency, sp.User_ID,
              s.Stock_Name, s.Ticker_Symbol,
              i.Due_Date,
              ba.Bank_Name, ba.Account_No,
              u.First_Name, u.Last_Name, u.Email_ID
       FROM SIP_Transaction st
       JOIN SIP_Plan sp ON st.SIP_ID = sp.SIP_ID
       JOIN Stock s ON sp.Stock_ID = s.Stock_ID
       JOIN Installments i ON st.Installment_ID = i.Inst_ID
       JOIN Bank_Account ba ON st.Account_ID = ba.Account_ID
       JOIN User u ON sp.User_ID = u.User_ID
       WHERE st.Transaction_ID = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const t = rows[0];
    if (t.User_ID !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this receipt' });
    }
    if (t.Status !== 'Success') {
      return res.status(400).json({ error: 'Receipts are only available for successful payments' });
    }

    const maskedAccount = t.Account_No.length > 4
      ? `••••${t.Account_No.slice(-4)}`
      : t.Account_No;
    const totalCharged = Number(t.Amount) + Number(t.Round_Up_Amount || 0);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${t.Transaction_ID}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Header
    doc.rect(0, 0, doc.page.width, 90).fill('#4f46e5');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('SIP Manager', 50, 30);
    doc.fontSize(11).font('Helvetica').text('Payment Receipt', 50, 58);
    doc.fillColor('#000000');

    doc.moveDown(4);
    doc.fontSize(10).fillColor('#666666')
      .text(`Receipt No: TXN-${String(t.Transaction_ID).padStart(6, '0')}`, 50, 120)
      .text(`Date: ${new Date(t.Transaction_Date).toLocaleString('en-IN')}`, 50, 135);

    doc.fillColor('#22c55e').font('Helvetica-Bold').fontSize(12)
      .text('SUCCESS', 400, 120, { align: 'right' });
    doc.fillColor('#000000').font('Helvetica');

    // Divider
    doc.moveTo(50, 165).lineTo(545, 165).strokeColor('#e5e7eb').stroke();

    let y = 185;
    function row(label, value, opts = {}) {
      doc.fontSize(10).fillColor('#666666').text(label, 50, y);
      doc.fontSize(11).fillColor('#111111').font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, 250, y, { width: 295, align: 'right' });
      doc.font('Helvetica');
      y += 26;
    }

    row('Paid by', `${t.First_Name} ${t.Last_Name}`);
    row('Email', t.Email_ID);
    row('Stock', `${t.Stock_Name} (${t.Ticker_Symbol})`);
    row('SIP Frequency', t.Frequency);
    row('Installment Due Date', t.Due_Date);
    row('Paid From', `${t.Bank_Name} ${maskedAccount}`);
    if (Number(t.Round_Up_Amount) > 0) {
      row('Installment Amount', `Rs. ${Number(t.Amount).toLocaleString('en-IN')}`);
      row('Round-Up (to goal)', `Rs. ${Number(t.Round_Up_Amount).toLocaleString('en-IN')}`);
    }

    doc.moveTo(50, y + 4).lineTo(545, y + 4).strokeColor('#e5e7eb').stroke();
    y += 20;
    row('Total Charged', `Rs. ${totalCharged.toLocaleString('en-IN')}`, { bold: true });

    doc.fontSize(9).fillColor('#999999')
      .text('This is a system-generated receipt for a SIP Management System college project.', 50, 760, {
        width: 495,
        align: 'center'
      });

    doc.end();
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
}

module.exports = { payInstallment, getUserTransactions, getReceipt };

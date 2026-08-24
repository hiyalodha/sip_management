const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const sipRoutes = require('./routes/sipRoutes');
const installmentRoutes = require('./routes/installmentRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const stockRoutes = require('./routes/stockRoutes');
const bankRoutes = require('./routes/bankRoutes');
const userRoutes = require('./routes/userRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const goalRoutes = require('./routes/goalRoutes');
const badgesRoutes = require('./routes/badgesRoutes');
const { startStockPriceScheduler } = require('./services/stockPriceService');
const { startOverdueScheduler } = require('./services/overdueService');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'SIP Management System API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sip', sipRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/user', userRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/badges', badgesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startStockPriceScheduler();
  startOverdueScheduler();
});
const yahooFinance = require('yahoo-finance2').default;
const cron = require('node-cron');
const pool = require('../db');

// All the stocks seeded in this project (RELIANCE, TCS, HDFCBANK, INFY,
// ADANIENT) are listed on India's NSE. Yahoo Finance identifies NSE tickers
// with a ".NS" suffix (e.g. "RELIANCE.NS") — the DB keeps the clean ticker
// symbol, and we only add the suffix when calling out to Yahoo.
function toYahooSymbol(ticker) {
  return `${ticker}.NS`;
}

async function updateStockPrice(stock) {
  try {
    const quote = await yahooFinance.quote(toYahooSymbol(stock.Ticker_Symbol));
    const price = quote?.regularMarketPrice;

    if (!price) {
      console.log(`No price available for ${stock.Ticker_Symbol}`);
      return;
    }

    await pool.query(
      `UPDATE Stock SET Current_Price = ?, Last_Updated = NOW() WHERE Stock_ID = ?`,
      [price, stock.Stock_ID]
    );

    console.log(`${stock.Ticker_Symbol} -> ₹${price} updated successfully`);
  } catch (error) {
    console.error(`Failed to update ${stock.Ticker_Symbol}:`, error.message);
  }
}

async function updateAllStockPrices() {
  try {
    const [stocks] = await pool.query('SELECT * FROM Stock');
    console.log(`Updating prices for ${stocks.length} stock(s)...`);

    for (const stock of stocks) {
      await updateStockPrice(stock);
    }

    console.log('Stock price update completed.');
  } catch (error) {
    console.error('Stock price update failed:', error.message);
  }
}

// Runs once on startup, then every 15 minutes. Yahoo's quote endpoint has no
// documented hard rate limit for this kind of light polling, but 15 minutes
// is plenty fresh for a project like this without hammering it.
function startStockPriceScheduler() {
  updateAllStockPrices();
  cron.schedule('*/15 * * * *', updateAllStockPrices);
  console.log('Stock price scheduler started (runs every 15 minutes).');
}

module.exports = { updateAllStockPrices, startStockPriceScheduler };

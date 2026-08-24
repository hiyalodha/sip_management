-- Migration for existing databases: adds more NSE-listed stocks beyond the
-- original 5, spanning banking, FMCG, IT, auto, pharma, metals, and energy.
-- Prices below are rough placeholders — the live price scheduler
-- (services/stockPriceService.js) overwrites them with real Yahoo Finance
-- quotes within 15 minutes of the server starting.
-- Run: mysql -u root sip_management < add_more_stocks.sql
-- Safe to re-run — INSERT IGNORE skips any ticker that already exists.

USE sip_management;

INSERT IGNORE INTO Stock (Stock_Name, Sector, Ticker_Symbol, Risk_Level, Current_Price) VALUES
('ICICI Bank', 'Banking', 'ICICIBANK', 'Low', 1180.00),
('Hindustan Unilever', 'FMCG', 'HINDUNILVR', 'Low', 2450.00),
('ITC Limited', 'FMCG', 'ITC', 'Low', 460.00),
('State Bank of India', 'Banking', 'SBIN', 'Medium', 810.00),
('Bharti Airtel', 'Telecom', 'BHARTIARTL', 'Medium', 1580.00),
('Kotak Mahindra Bank', 'Banking', 'KOTAKBANK', 'Low', 1750.00),
('Larsen & Toubro', 'Infrastructure', 'LT', 'Medium', 3600.00),
('Axis Bank', 'Banking', 'AXISBANK', 'Medium', 1150.00),
('Asian Paints', 'Consumer Goods', 'ASIANPAINT', 'Medium', 2900.00),
('Maruti Suzuki', 'Automobile', 'MARUTI', 'Medium', 12500.00),
('Sun Pharmaceutical', 'Pharma', 'SUNPHARMA', 'Medium', 1750.00),
('Titan Company', 'Consumer Goods', 'TITAN', 'Medium', 3400.00),
('UltraTech Cement', 'Infrastructure', 'ULTRACEMCO', 'Medium', 11200.00),
('Wipro', 'IT', 'WIPRO', 'Medium', 550.00),
('Nestle India', 'FMCG', 'NESTLEIND', 'Low', 2350.00),
('Bajaj Finance', 'Financial Services', 'BAJFINANCE', 'High', 7000.00),
('Tata Motors', 'Automobile', 'TATAMOTORS', 'High', 780.00),
('Tata Steel', 'Metals', 'TATASTEEL', 'High', 145.00),
('HCL Technologies', 'IT', 'HCLTECH', 'Low', 1800.00),
('Power Grid Corporation', 'Power', 'POWERGRID', 'Low', 320.00),
('NTPC Limited', 'Power', 'NTPC', 'Low', 380.00),
('Oil & Natural Gas Corporation', 'Energy', 'ONGC', 'Medium', 260.00),
('Coal India', 'Energy', 'COALINDIA', 'Medium', 400.00),
('JSW Steel', 'Metals', 'JSWSTEEL', 'High', 950.00),
('Tech Mahindra', 'IT', 'TECHM', 'Medium', 1650.00);

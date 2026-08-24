-- SIP Management System - MySQL Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS sip_management;
USE sip_management;

-- 1. User
CREATE TABLE User (
  User_ID INT AUTO_INCREMENT PRIMARY KEY,
  First_Name VARCHAR(100) NOT NULL,
  Last_Name VARCHAR(100) NOT NULL,
  Email_ID VARCHAR(150) NOT NULL UNIQUE,
  Pan_Number VARCHAR(20) NOT NULL UNIQUE,
  DOB DATE NOT NULL,
  Password VARCHAR(255) NOT NULL,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. User_Phone
CREATE TABLE User_Phone (
  Phone_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Phone_Number VARCHAR(20) NOT NULL,
  Is_Verified TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
);

-- 3. Bank_Account
CREATE TABLE Bank_Account (
  Account_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Account_No VARCHAR(30) NOT NULL,
  Bank_Name VARCHAR(100) NOT NULL,
  IFSC_Code VARCHAR(15) NOT NULL,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
);

-- 4. Stock
CREATE TABLE Stock (
  Stock_ID INT AUTO_INCREMENT PRIMARY KEY,
  Stock_Name VARCHAR(150) NOT NULL,
  Sector VARCHAR(100),
  Ticker_Symbol VARCHAR(20) NOT NULL UNIQUE,
  Risk_Level ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  Current_Price DECIMAL(12,2) NOT NULL,
  Last_Updated DATETIME NULL
);

-- 4b. Goal — a savings target a student is investing toward (e.g. "New
-- Laptop", "College Fees"). Not part of the original spec's 7 tables, added
-- as a student-friendly framing layer on top of SIPs.
CREATE TABLE Goal (
  Goal_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Goal_Name VARCHAR(100) NOT NULL,
  Target_Amount DECIMAL(12,2) NOT NULL,
  Target_Date DATE NULL,
  Status ENUM('Active', 'Achieved', 'Archived') DEFAULT 'Active',
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Invite_Code VARCHAR(8) NULL UNIQUE,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
);

-- 4c. Goal_Member — lets friends join someone else's goal (e.g. a shared trip
-- fund) via an invite code, then link their own SIPs to contribute to it.
CREATE TABLE Goal_Member (
  Goal_Member_ID INT AUTO_INCREMENT PRIMARY KEY,
  Goal_ID INT NOT NULL,
  User_ID INT NOT NULL,
  Joined_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Goal_ID) REFERENCES Goal(Goal_ID) ON DELETE CASCADE,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
  UNIQUE KEY uniq_goal_member (Goal_ID, User_ID)
);

-- 5. SIP_Plan
CREATE TABLE SIP_Plan (
  SIP_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Stock_ID INT NOT NULL,
  Goal_ID INT NULL,
  Amount DECIMAL(12,2) NOT NULL,
  Frequency ENUM('Monthly', 'Quarterly') NOT NULL DEFAULT 'Monthly',
  Start_Date DATE NOT NULL,
  Status ENUM('Active', 'Paused', 'Cancelled', 'Completed') DEFAULT 'Active',
  Round_Up_Enabled TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
  FOREIGN KEY (Stock_ID) REFERENCES Stock(Stock_ID),
  FOREIGN KEY (Goal_ID) REFERENCES Goal(Goal_ID) ON DELETE SET NULL
);

-- 6. Installments
CREATE TABLE Installments (
  Inst_ID INT AUTO_INCREMENT PRIMARY KEY,
  SIP_ID INT NOT NULL,
  Due_Date DATE NOT NULL,
  Paid_Date DATE NULL,
  Amount DECIMAL(12,2) NOT NULL,
  Status ENUM('Pending', 'Paid', 'Overdue') DEFAULT 'Pending',
  FOREIGN KEY (SIP_ID) REFERENCES SIP_Plan(SIP_ID) ON DELETE CASCADE
);

-- 7. SIP_Transaction
CREATE TABLE SIP_Transaction (
  Transaction_ID INT AUTO_INCREMENT PRIMARY KEY,
  SIP_ID INT NOT NULL,
  Installment_ID INT NOT NULL,
  Account_ID INT NOT NULL,
  Amount DECIMAL(12,2) NOT NULL,
  Transaction_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
  Status ENUM('Success', 'Failed', 'Pending') DEFAULT 'Success',
  Round_Up_Amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (SIP_ID) REFERENCES SIP_Plan(SIP_ID) ON DELETE CASCADE,
  FOREIGN KEY (Installment_ID) REFERENCES Installments(Inst_ID) ON DELETE CASCADE,
  FOREIGN KEY (Account_ID) REFERENCES Bank_Account(Account_ID)
);

-- Sample stock data — a spread of well-known NSE-listed stocks across
-- sectors. Prices are rough placeholders; the live price scheduler
-- (services/stockPriceService.js) overwrites them with real Yahoo Finance
-- quotes within 15 minutes of the server starting.
INSERT INTO Stock (Stock_Name, Sector, Ticker_Symbol, Risk_Level, Current_Price) VALUES
('Reliance Industries', 'Energy', 'RELIANCE', 'Medium', 2450.50),
('Tata Consultancy Services', 'IT', 'TCS', 'Low', 3820.00),
('HDFC Bank', 'Banking', 'HDFCBANK', 'Low', 1650.75),
('Infosys', 'IT', 'INFY', 'Medium', 1480.20),
('Adani Enterprises', 'Infrastructure', 'ADANIENT', 'High', 2890.10),
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

-- Trigger: when an installment is marked Paid, check whether every installment
-- belonging to that SIP is now Paid. If so, the SIP itself is auto-marked
-- Completed. This is real database-side business logic, not app-side code —
-- it fires no matter what client (or even a raw SQL UPDATE) changes the row.
DELIMITER $$

CREATE TRIGGER trg_installment_paid_check_completion
AFTER UPDATE ON Installments
FOR EACH ROW
BEGIN
  IF NEW.Status = 'Paid' AND (OLD.Status IS NULL OR OLD.Status <> 'Paid') THEN
    IF NOT EXISTS (
      SELECT 1 FROM Installments
      WHERE SIP_ID = NEW.SIP_ID AND Status <> 'Paid'
    ) THEN
      UPDATE SIP_Plan
      SET Status = 'Completed'
      WHERE SIP_ID = NEW.SIP_ID AND Status = 'Active';
    END IF;
  END IF;
END$$

DELIMITER ;

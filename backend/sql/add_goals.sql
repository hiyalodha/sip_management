-- Migration for existing databases: adds the Goal table and links SIP_Plan
-- to it, powering the "Savings Goals" feature (e.g. "New Laptop", "College
-- Fees") where students can tie one or more SIPs toward a target amount.
-- Run: mysql -u root sip_management < add_goals.sql

USE sip_management;

CREATE TABLE IF NOT EXISTS Goal (
  Goal_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Goal_Name VARCHAR(100) NOT NULL,
  Target_Amount DECIMAL(12,2) NOT NULL,
  Target_Date DATE NULL,
  Status ENUM('Active', 'Achieved', 'Archived') DEFAULT 'Active',
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
);

ALTER TABLE SIP_Plan ADD COLUMN Goal_ID INT NULL;
ALTER TABLE SIP_Plan ADD FOREIGN KEY (Goal_ID) REFERENCES Goal(Goal_ID) ON DELETE SET NULL;

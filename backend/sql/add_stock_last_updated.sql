-- Migration for existing databases: adds the Last_Updated column the live
-- stock price service needs. Safe to run once.
-- Run: mysql -u root sip_management < add_stock_last_updated.sql

USE sip_management;

ALTER TABLE Stock ADD COLUMN Last_Updated DATETIME NULL;

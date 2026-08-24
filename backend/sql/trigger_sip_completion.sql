-- Migration for existing databases that were set up before this trigger existed.
-- Run: mysql -u root sip_management < trigger_sip_completion.sql
-- (Safe to run even if you're not sure whether it's already applied — it drops
-- the trigger first if present, then recreates it.)

USE sip_management;

DROP TRIGGER IF EXISTS trg_installment_paid_check_completion;

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

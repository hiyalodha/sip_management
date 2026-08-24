-- Round-up savings: rounds each installment payment up to the nearest ₹50 and
-- credits the difference toward the SIP's linked goal.
ALTER TABLE SIP_Plan
  ADD COLUMN Round_Up_Enabled TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE SIP_Transaction
  ADD COLUMN Round_Up_Amount DECIMAL(10,2) NOT NULL DEFAULT 0;

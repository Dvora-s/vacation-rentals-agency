-- מסלולי מספר דירות + מעקב שימוש במסלול
ALTER TABLE pricing_plans
  ADD COLUMN IF NOT EXISTS listing_slots INT NOT NULL DEFAULT 1;

ALTER TABLE listing_payments
  ADD COLUMN IF NOT EXISTS slots_total INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS slots_used INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NULL;

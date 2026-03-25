-- Add call_types and call_outcomes scope filters to eval_criteria
-- When non-empty, the criterion only applies to calls matching those values

ALTER TABLE eval_criteria
  ADD COLUMN IF NOT EXISTS call_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS call_outcomes text[] NOT NULL DEFAULT '{}';

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS call_taxonomy JSONB;

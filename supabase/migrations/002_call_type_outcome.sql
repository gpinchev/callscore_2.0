-- Add call_type and call_outcome to transcripts
ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS call_type TEXT,
  ADD COLUMN IF NOT EXISTS call_outcome TEXT;

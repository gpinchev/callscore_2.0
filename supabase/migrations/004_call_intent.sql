ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS call_intent TEXT;

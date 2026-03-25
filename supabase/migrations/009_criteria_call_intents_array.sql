-- Add call_intents TEXT[] to eval_criteria for multi-intent support
ALTER TABLE eval_criteria
  ADD COLUMN IF NOT EXISTS call_intents TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing single call_intent values into the new array column
UPDATE eval_criteria
  SET call_intents = ARRAY[call_intent]
  WHERE call_intent IS NOT NULL AND call_intents = '{}';

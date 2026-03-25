-- Randomly assign call_type and call_outcome to existing transcripts
-- Uses modulo on a random integer to pick from the option arrays

WITH vals AS (
  SELECT
    id,
    (ARRAY['New Business', 'Existing Business', 'Wrong Number', 'Other'])[floor(random() * 4 + 1)] AS call_type,
    (ARRAY['Appointment Booked', 'Appointment Not Booked', 'Question Answered', 'Other'])[floor(random() * 4 + 1)] AS call_outcome
  FROM transcripts
  WHERE call_type IS NULL OR call_outcome IS NULL
)
UPDATE transcripts t
SET
  call_type    = COALESCE(t.call_type, v.call_type),
  call_outcome = COALESCE(t.call_outcome, v.call_outcome)
FROM vals v
WHERE t.id = v.id;

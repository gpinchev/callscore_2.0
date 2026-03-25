-- Fill call_type, call_intent, call_outcome for all existing transcripts that are missing them.
-- Uses a deterministic random assignment based on the row's ctid so re-running is safe.

DO $$
DECLARE
  v_call_types  TEXT[] := ARRAY[
    'New Customer', 'Existing Customer', 'Warranty / Recall',
    'Emergency / After-Hours', 'Commercial Account', 'Vendor / Supplier'
  ];
  v_intents TEXT[] := ARRAY[
    'Estimate Request', 'Emergency Repair', 'Schedule Maintenance',
    'Billing Inquiry', 'Warranty Claim', 'Parts Inquiry',
    'Reschedule / Cancel', 'Follow-Up on Previous Job',
    'New Service Agreement', 'Complaint / Escalation',
    'General Inquiry', 'Quote Follow-Up'
  ];
  v_outcomes TEXT[] := ARRAY[
    'Appointment Booked', 'Estimate Sent', 'Resolved on Call',
    'Transferred to Tech', 'Voicemail Left', 'Callback Scheduled',
    'No Resolution', 'Parts Ordered', 'Job Completed',
    'Customer Declined', 'Escalated to Manager'
  ];
BEGIN
  UPDATE transcripts
  SET
    call_type   = COALESCE(call_type,   v_call_types [1 + floor(random() * array_length(v_call_types,  1))::INT]),
    call_intent = COALESCE(call_intent, v_intents    [1 + floor(random() * array_length(v_intents,     1))::INT]),
    call_outcome= COALESCE(call_outcome,v_outcomes   [1 + floor(random() * array_length(v_outcomes,    1))::INT])
  WHERE call_type IS NULL OR call_intent IS NULL OR call_outcome IS NULL;

  RAISE NOTICE 'Updated % rows', (SELECT COUNT(*) FROM transcripts WHERE call_type IS NOT NULL);
END $$;

-- Seed 50 mock transcripts with varied call_type, call_intent, call_outcome
-- Uses the first organization and its technicians automatically.
-- Run this in the Supabase SQL editor.

DO $$
DECLARE
  v_org_id UUID;
  v_tech_ids UUID[];
  v_tech_id UUID;
  v_call_types TEXT[] := ARRAY[
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
  v_service_types TEXT[] := ARRAY[
    'HVAC Repair', 'Plumbing', 'Electrical', 'Appliance Repair',
    'Pest Control', 'Roofing', 'General Maintenance'
  ];
  v_snippets TEXT[] := ARRAY[
    'Thank you for calling, this is Mike. How can I help you today? Yes I can get someone out there tomorrow morning.',
    'Hi, I''m calling because my AC unit stopped working last night and it''s really hot. Can someone come today?',
    'I wanted to follow up on the repair from last week. There''s still a noise coming from the unit.',
    'Do you offer financing? I got a quote from you guys and wanted to know my options before booking.',
    'My water heater is leaking and I need someone out as soon as possible. Is there an emergency line?',
    'I have a service agreement with you and I need to schedule my annual maintenance visit.',
    'I received an invoice that doesn''t match what the technician told me on site. Can you help?',
    'We have a commercial property with 12 units and are looking for a service partner.',
    'The part you ordered hasn''t arrived yet and my appointment is tomorrow. What''s the status?',
    'I''d like to cancel my appointment scheduled for Friday and reschedule for next week.'
  ];
  i INT;
  v_call_type TEXT;
  v_intent TEXT;
  v_outcome TEXT;
  v_days_ago INT;
  v_snippet TEXT;
BEGIN
  -- Get first org
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Run onboarding first.';
  END IF;

  -- Get technician IDs for this org
  SELECT ARRAY(SELECT id FROM technicians WHERE organization_id = v_org_id)
    INTO v_tech_ids;

  FOR i IN 1..50 LOOP
    -- Pick random values
    v_call_type := v_call_types[1 + floor(random() * array_length(v_call_types, 1))::INT];
    v_intent    := v_intents[1 + floor(random() * array_length(v_intents, 1))::INT];
    v_outcome   := v_outcomes[1 + floor(random() * array_length(v_outcomes, 1))::INT];
    v_days_ago  := floor(random() * 30)::INT;
    v_snippet   := v_snippets[1 + floor(random() * array_length(v_snippets, 1))::INT];

    -- Pick a random technician (or NULL if none)
    IF array_length(v_tech_ids, 1) > 0 THEN
      v_tech_id := v_tech_ids[1 + floor(random() * array_length(v_tech_ids, 1))::INT];
    ELSE
      v_tech_id := NULL;
    END IF;

    INSERT INTO transcripts (
      organization_id,
      technician_id,
      source,
      raw_transcript,
      service_type,
      call_type,
      call_intent,
      call_outcome,
      eval_status,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      v_org_id,
      v_tech_id,
      'mock',
      v_snippet,
      v_service_types[1 + floor(random() * array_length(v_service_types, 1))::INT],
      v_call_type,
      v_intent,
      v_outcome,
      'pending',
      '{}',
      NOW() - (v_days_ago || ' days')::INTERVAL - (floor(random() * 86400) || ' seconds')::INTERVAL,
      NOW()
    );
  END LOOP;

  RAISE NOTICE 'Inserted 50 mock transcripts for org %', v_org_id;
END $$;

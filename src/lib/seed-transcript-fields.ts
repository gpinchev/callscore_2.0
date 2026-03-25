/**
 * Fills NULL call_type / call_intent / call_outcome for existing transcripts
 * using deterministic values derived from each transcript's UUID.
 * Also creates mock customers if the customers table exists.
 * Safe to call on every page load — only touches rows that still have NULLs.
 */

import { createServerClient } from "@/lib/supabase/server";
import { CALL_TAXONOMY, CALL_TYPES } from "@/lib/call-taxonomy";

const CUSTOMER_NAMES = [
  "James Carter", "Maria Lopez", "David Kim", "Sarah Johnson", "Michael Brown",
  "Emily Davis", "Robert Wilson", "Jessica Martinez", "William Anderson", "Ashley Thomas",
  "Christopher Jackson", "Amanda White", "Matthew Harris", "Stephanie Taylor", "Joshua Moore",
  "Nicole Martin", "Andrew Garcia", "Melissa Robinson", "Daniel Clark", "Lauren Lewis",
  "Kevin Hall", "Brittany Allen", "Ryan Young", "Samantha Hernandez", "Justin King",
  "Megan Wright", "Brandon Scott", "Rachel Green", "Tyler Adams", "Stephanie Baker",
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

export async function seedTranscriptFields(orgId: string): Promise<void> {
  const supabase = createServerClient();

  // Only select columns we know exist (call_type, call_intent, call_outcome
  // were added in migrations 002 + 004)
  const { data: transcripts, error } = await supabase
    .from("transcripts")
    .select("id, call_type, call_intent, call_outcome")
    .eq("organization_id", orgId)
    .or("call_type.is.null,call_intent.is.null,call_outcome.is.null");

  if (error) {
    console.error("seedTranscriptFields: query error", error.message);
    return;
  }
  if (!transcripts?.length) return;

  // Check whether the customers table and customer_id column exist
  const { error: custCheckErr } = await supabase
    .from("customers")
    .select("id")
    .limit(1);
  const customersExist = !custCheckErr;

  // If customers table exists, check which transcripts already have customer_id
  const linkedCustomerIds = new Map<string, string | null>();
  if (customersExist) {
    const { data: linkedRows } = await supabase
      .from("transcripts")
      .select("id, customer_id")
      .eq("organization_id", orgId)
      .in("id", transcripts.map((t) => t.id));
    for (const row of linkedRows ?? []) {
      linkedCustomerIds.set(row.id, row.customer_id);
    }
  }

  for (const t of transcripts) {
    const h = hash(t.id);

    const callType = (t.call_type as string | null) ?? pick(CALL_TYPES, h);
    const taxonomy = CALL_TAXONOMY[callType as keyof typeof CALL_TAXONOMY];
    const intents = taxonomy?.intents ?? ["General Inquiry"];
    const outcomes = taxonomy?.outcomes ?? ["No Action Needed"];

    const callIntent = (t.call_intent as string | null) ?? pick(intents, h * 7);
    const callOutcome = (t.call_outcome as string | null) ?? pick(outcomes, h * 13);

    const updates: Record<string, string | null> = {};
    if (!t.call_type) updates.call_type = callType;
    if (!t.call_intent) updates.call_intent = callIntent;
    if (!t.call_outcome) updates.call_outcome = callOutcome;

    // Create a mock customer if table exists and transcript has none
    if (customersExist && !linkedCustomerIds.get(t.id)) {
      const customerName = pick(CUSTOMER_NAMES, h * 3);
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          organization_id: orgId,
          name: customerName,
          phone: `(${String(h % 900 + 100)}) ${String((h * 7) % 900 + 100)}-${String((h * 13) % 9000 + 1000)}`,
        })
        .select("id")
        .single();
      if (newCustomer?.id) updates.customer_id = newCustomer.id;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from("transcripts")
        .update(updates)
        .eq("id", t.id);
      if (updateErr) {
        console.error("seedTranscriptFields: update error for", t.id, updateErr.message);
      }
    }
  }
}

import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { TranscriptList } from "@/components/transcripts/transcript-list";
import { seedTranscriptFields } from "@/lib/seed-transcript-fields";

export const metadata: Metadata = { title: "Calls" };

export default async function TranscriptsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Fill any NULL call fields with deterministic mock data (idempotent)
  await seedTranscriptFields(orgId);

  const supabase = createServerClient();

  // Try to join customers; fall back gracefully if the table doesn't exist yet
  let { data: transcripts, error: txError } = await supabase
    .from("transcripts")
    .select("*, technicians(name), customers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (txError) {
    const fallback = await supabase
      .from("transcripts")
      .select("*, technicians(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    transcripts = fallback.data;
  }

  const { data: technicians } = await supabase
    .from("technicians")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  return (
    <TranscriptList
      orgId={orgId}
      transcripts={transcripts || []}
      technicians={technicians || []}
    />
  );
}

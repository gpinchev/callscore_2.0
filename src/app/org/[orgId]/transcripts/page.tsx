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

  // Best-effort seed — never crash the page
  try {
    await seedTranscriptFields(orgId);
  } catch {
    // ignore
  }

  let transcripts: unknown[] = [];
  let technicians: { id: string; name: string }[] = [];

  try {
    const supabase = createServerClient();

    // Try with customers join first; fall back without it
    const { data: txData, error: txError } = await supabase
      .from("transcripts")
      .select("*, technicians(name), customers(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (txError) {
      const { data: fallback } = await supabase
        .from("transcripts")
        .select("*, technicians(name)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      transcripts = fallback || [];
    } else {
      transcripts = txData || [];
    }

    const { data: techData } = await supabase
      .from("technicians")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name");
    technicians = techData || [];
  } catch {
    // Supabase unavailable — TranscriptList will show mock rows
  }

  return (
    <TranscriptList
      orgId={orgId}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transcripts={transcripts as any}
      technicians={technicians}
    />
  );
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createTranscriptSchema = z.object({
  organizationId: z.string().uuid(),
  technicianId: z.string().uuid().nullable().optional(),
  rawTranscript: z.string().min(1, "Transcript text is required"),
  serviceType: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  callType: z.string().max(100).nullable().optional(),
  callIntent: z.string().max(100).nullable().optional(),
  callOutcome: z.string().max(100).nullable().optional(),
});

export async function GET(request: Request) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId query parameter is required" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("transcripts")
    .select("*, technicians(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const technicianId = searchParams.get("technicianId");
  if (technicianId) {
    query = query.eq("technician_id", technicianId);
  }

  const source = searchParams.get("source");
  if (source) {
    query = query.eq("source", source);
  }

  const evalStatus = searchParams.get("evalStatus");
  if (evalStatus) {
    query = query.eq("eval_status", evalStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error("transcripts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcripts" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTranscriptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { organizationId, technicianId, rawTranscript, serviceType, location, callType, callIntent, callOutcome } =
    parsed.data;

  const { data, error } = await supabase
    .from("transcripts")
    .insert({
      organization_id: organizationId,
      technician_id: technicianId || null,
      source: "paste",
      raw_transcript: rawTranscript,
      diarized_transcript: null,
      audio_url: null,
      audio_duration_seconds: null,
      service_type: serviceType || null,
      location: location || null,
      call_type: callType || null,
      call_intent: callIntent || null,
      call_outcome: callOutcome || null,
      eval_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("transcripts POST error:", error);
    return NextResponse.json(
      { error: "Failed to create transcript" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

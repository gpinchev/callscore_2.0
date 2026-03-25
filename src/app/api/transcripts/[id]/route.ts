import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const patchSchema = z.object({
  call_type: z.string().max(100).nullable().optional(),
  call_intent: z.string().max(100).nullable().optional(),
  call_outcome: z.string().max(100).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("transcripts")
    .select("*, technicians(name, role)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("transcripts/[id] GET error:", error);
    return NextResponse.json(
      { error: "Transcript not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("transcripts")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("transcripts/[id] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update transcript" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch transcript to get audio_url for storage cleanup
  const { data: transcript } = await supabase
    .from("transcripts")
    .select("audio_url")
    .eq("id", id)
    .single();

  // Delete eval_results first (cascade should handle, but be explicit)
  await supabase.from("eval_results").delete().eq("transcript_id", id);

  // Delete the transcript
  const { error } = await supabase
    .from("transcripts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("transcripts/[id] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete transcript" },
      { status: 500 }
    );
  }

  // Clean up audio file from storage if exists
  if (transcript?.audio_url) {
    try {
      const url = new URL(transcript.audio_url);
      // Extract path after /object/public/recordings/
      const storagePath = url.pathname.split("/object/public/recordings/")[1];
      if (storagePath) {
        await supabase.storage
          .from("recordings")
          .remove([decodeURIComponent(storagePath)]);
      }
    } catch {
      // Storage cleanup is best-effort
      console.error("Failed to clean up audio file from storage");
    }
  }

  return NextResponse.json({ success: true });
}

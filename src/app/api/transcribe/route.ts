import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const transcribeSchema = z.object({
  audioUrl: z.string().url(),
  organizationId: z.string().uuid(),
  technicianId: z.string().uuid().nullable().optional(),
  serviceType: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  callType: z.string().max(100).nullable().optional(),
  callIntent: z.string().max(100).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = transcribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { audioUrl, organizationId, technicianId, serviceType, location, callType, callIntent } =
    parsed.data;

  // Fetch audio from Supabase Storage
  let audioResponse: Response;
  try {
    audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch audio file" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch audio file from storage" },
      { status: 400 }
    );
  }

  const audioBuffer = await audioResponse.arrayBuffer();
  const contentType =
    audioResponse.headers.get("content-type") || "audio/webm";

  // Send to Deepgram Nova-2
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 }
    );
  }

  let deepgramResult: DeepgramResponse;
  try {
    const dgResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true&utterances=true&language=en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      }
    );

    if (!dgResponse.ok) {
      const errText = await dgResponse.text();
      console.error("Deepgram error:", dgResponse.status, errText);
      return NextResponse.json(
        { error: "Transcription service error" },
        { status: 502 }
      );
    }

    deepgramResult = await dgResponse.json();
  } catch (err) {
    console.error("Deepgram request failed:", err);
    return NextResponse.json(
      { error: "Failed to connect to transcription service" },
      { status: 502 }
    );
  }

  // Parse Deepgram response
  const rawTranscript =
    deepgramResult.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

  const utterances = deepgramResult.results?.utterances || [];
  const diarizedTranscript = utterances.map(
    (u: DeepgramUtterance) => ({
      speaker: u.speaker,
      text: u.transcript,
      start: u.start,
      end: u.end,
    })
  );

  const duration = deepgramResult.metadata?.duration
    ? Math.round(deepgramResult.metadata.duration)
    : null;

  if (!rawTranscript) {
    return NextResponse.json(
      { error: "No transcript generated from audio" },
      { status: 422 }
    );
  }

  // Insert into transcripts table
  const { data, error } = await supabase
    .from("transcripts")
    .insert({
      organization_id: organizationId,
      technician_id: technicianId || null,
      source: "recording",
      raw_transcript: rawTranscript,
      diarized_transcript: diarizedTranscript.length > 0 ? diarizedTranscript : null,
      audio_url: audioUrl,
      audio_duration_seconds: duration,
      service_type: serviceType || null,
      location: location || null,
      call_type: callType || null,
      call_intent: callIntent || null,
      eval_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json(
      { error: "Failed to save transcript" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

// Deepgram response types (minimal, for parsing)
interface DeepgramUtterance {
  speaker: number;
  transcript: string;
  start: number;
  end: number;
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
      }>;
    }>;
    utterances?: DeepgramUtterance[];
  };
  metadata?: {
    duration?: number;
  };
}

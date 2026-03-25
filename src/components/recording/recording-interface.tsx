"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { WaveformCanvas } from "./waveform-canvas";
import { createClient } from "@/lib/supabase/client";
import { CALL_TYPES, getIntents } from "@/lib/call-taxonomy";

type RecordingState = "idle" | "recording" | "processing" | "complete";

interface Props {
  orgId: string;
  technicians: Array<{ id: string; name: string; role: string | null }>;
  industry: string;
}

const SERVICE_TYPE_SUGGESTIONS: Record<string, string> = {
  hvac: "e.g., AC repair, furnace install, maintenance plan",
  plumbing: "e.g., drain cleaning, water heater, leak repair",
  electrical: "e.g., panel upgrade, outlet install, inspection",
  general: "e.g., service call, consultation, follow-up",
};

export function RecordingInterface({ orgId, technicians, industry }: Props) {
  const router = useRouter();
  const [state, setState] = useState<RecordingState>("idle");
  const [technicianId, setTechnicianId] = useState<string>("");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [callType, setCallType] = useState("");
  const [callIntent, setCallIntent] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const intentOptions = getIntents(callType);

  function handleCallTypeChange(val: string) {
    setCallType(val);
    setCallIntent("");
  }
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getMimeType = () => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      return { mimeType: "audio/webm;codecs=opus", ext: "webm" };
    }
    if (MediaRecorder.isTypeSupported("audio/mp4")) {
      return { mimeType: "audio/mp4", ext: "mp4" };
    }
    if (MediaRecorder.isTypeSupported("audio/webm")) {
      return { mimeType: "audio/webm", ext: "webm" };
    }
    return { mimeType: "", ext: "webm" };
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API analyser for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const { mimeType } = getMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => handleRecordingComplete();

      recorder.start(1000); // Collect data every second
      setState("recording");
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const handleRecordingComplete = async () => {
    setState("processing");

    const { mimeType, ext } = getMimeType();
    const blob = new Blob(chunksRef.current, {
      type: mimeType || "audio/webm",
    });

    // Upload to Supabase Storage
    const supabase = createClient();
    const timestamp = Date.now();
    const filePath = `${orgId}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(filePath, blob, { contentType: mimeType || "audio/webm" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload recording. Please try again.");
      setState("idle");
      return;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("recordings").getPublicUrl(filePath);

    // Call transcription API
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: publicUrl,
          organizationId: orgId,
          technicianId: technicianId || null,
          serviceType: serviceType || null,
          location: location || null,
          callType: callType || null,
          callIntent: callIntent || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Transcription failed");
      }

      const transcript = await response.json();
      setTranscriptId(transcript.id);
      setTranscriptPreview(
        transcript.raw_transcript?.slice(0, 120) +
          (transcript.raw_transcript?.length > 120 ? "..." : "")
      );
      setState("complete");
      toast.success("Call transcribed successfully!");
    } catch (err) {
      console.error("Transcription error:", err);
      toast.error(
        err instanceof Error ? err.message : "Transcription failed. Please try again."
      );
      setState("idle");
    }
  };

  const handleButtonClick = () => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-8rem)] px-4">
      {/* Pre-recording metadata form */}
      <div
        className={`w-full max-w-sm space-y-3 mb-8 transition-opacity ${
          state === "processing" ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {technicians.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="technician" className="text-sm text-muted-foreground">
              Technician
            </Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger id="technician">
                <SelectValue placeholder="Select technician (optional)" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.role ? ` — ${t.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="service-type" className="text-sm text-muted-foreground">
            Service Type
          </Label>
          <Input
            id="service-type"
            placeholder={SERVICE_TYPE_SUGGESTIONS[industry] || SERVICE_TYPE_SUGGESTIONS.general}
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-sm text-muted-foreground">
            Location
          </Label>
          <Input
            id="location"
            placeholder="Optional"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="call-type" className="text-sm text-muted-foreground">
            Call Type
          </Label>
          <Select value={callType} onValueChange={handleCallTypeChange}>
            <SelectTrigger id="call-type">
              <SelectValue placeholder="Who is calling?" />
            </SelectTrigger>
            <SelectContent>
              {CALL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="call-intent" className="text-sm text-muted-foreground">
            Intent
          </Label>
          <Select value={callIntent} onValueChange={setCallIntent} disabled={!callType}>
            <SelectTrigger id="call-intent">
              <SelectValue placeholder={callType ? "Why are they calling?" : "Select call type first"} />
            </SelectTrigger>
            <SelectContent>
              {intentOptions.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Waveform visualization (during recording) */}
      {state === "recording" && analyserRef.current && (
        <div className="w-full max-w-sm mb-4">
          <WaveformCanvas analyser={analyserRef.current} />
        </div>
      )}

      {/* Timer (during recording) */}
      {state === "recording" && (
        <p className="text-2xl font-mono font-medium tabular-nums mb-4">
          {formatTime(elapsed)}
        </p>
      )}

      {/* Processing state */}
      {state === "processing" && (
        <div className="flex flex-col items-center mb-6 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-lg font-medium text-amber-600">
            Analyzing your call...
          </p>
        </div>
      )}

      {/* Complete state */}
      {state === "complete" && (
        <div className="flex flex-col items-center mb-6 space-y-3 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-lg font-medium text-green-600">
            Transcription Complete
          </p>
          {transcriptPreview && (
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              &ldquo;{transcriptPreview}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Main record/stop button */}
      {(state === "idle" || state === "recording") && (
        <button
          onClick={handleButtonClick}
          className={`
            w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg active:scale-95
            ${
              state === "idle"
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            }
          `}
          aria-label={state === "idle" ? "Start recording" : "Stop recording"}
        >
          {state === "idle" ? (
            <Mic className="h-10 w-10 md:h-12 md:w-12" />
          ) : (
            <Square className="h-8 w-8 md:h-10 md:w-10" fill="currentColor" />
          )}
        </button>
      )}

      {/* Button label */}
      {state === "idle" && (
        <p className="mt-3 text-sm text-muted-foreground">Tap to Record</p>
      )}
      {state === "recording" && (
        <p className="mt-3 text-sm text-red-500 font-medium">Tap to Stop</p>
      )}

      {/* Complete actions */}
      {state === "complete" && transcriptId && (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              router.push(`/org/${orgId}/transcripts/${transcriptId}`)
            }
          >
            View Evaluation
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              setState("idle");
              setElapsed(0);
              setTranscriptId(null);
              setTranscriptPreview("");
            }}
          >
            Record Another
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  FileText,
  Sparkles,
  MapPin,
  Wrench,
  Calendar,
  User,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AudioPlayer } from "./audio-player";
import type { Transcript, EvalResult } from "@/lib/supabase/types";

type DiarizedSegment = {
  speaker: number;
  text: string;
  start: number;
  end: number;
};

type TranscriptWithTechnician = Transcript & {
  technicians: { name: string; role: string | null } | null;
};

type EvalResultWithCriteria = EvalResult & {
  eval_criteria: { name: string; category: string | null } | null;
};

interface Props {
  orgId: string;
  transcript: TranscriptWithTechnician;
  initialEvalResults: EvalResultWithCriteria[];
}

const SOURCE_CONFIG = {
  recording: { label: "Recorded", icon: Mic, className: "bg-blue-100 text-blue-700" },
  paste: { label: "Pasted", icon: FileText, className: "bg-gray-100 text-gray-700" },
  mock: { label: "Mock", icon: Sparkles, className: "bg-purple-100 text-purple-700" },
};

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  processing: { label: "Processing", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
};

const SPEAKER_COLORS = [
  "text-blue-700 bg-blue-50 border-blue-200",
  "text-emerald-700 bg-emerald-50 border-emerald-200",
  "text-purple-700 bg-purple-50 border-purple-200",
  "text-orange-700 bg-orange-50 border-orange-200",
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptDetail({ orgId, transcript: initialTranscript, initialEvalResults }: Props) {
  const router = useRouter();
  const [transcript, setTranscript] = useState(initialTranscript);
  const [evalResults, setEvalResults] = useState(initialEvalResults);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const hasTriggeredEval = useRef(false);

  const source =
    SOURCE_CONFIG[transcript.source as keyof typeof SOURCE_CONFIG] ||
    SOURCE_CONFIG.paste;
  const status =
    STATUS_CONFIG[transcript.eval_status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.pending;
  const SourceIcon = source.icon;

  const diarized = Array.isArray(transcript.diarized_transcript)
    ? (transcript.diarized_transcript as unknown as DiarizedSegment[])
    : null;

  const passedCount = evalResults.filter((r) => r.passed).length;
  const totalCount = evalResults.length;

  const formatCost = (value: number): string => {
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(2)}`;
  };

  // Auto-trigger evaluation for pending transcripts
  useEffect(() => {
    if (
      transcript.eval_status === "pending" &&
      evalResults.length === 0 &&
      !hasTriggeredEval.current
    ) {
      hasTriggeredEval.current = true;
      runEvaluation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runEvaluation = async () => {
    setEvaluating(true);
    setTranscript((prev) => ({ ...prev, eval_status: "processing" }));

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId: transcript.id }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Evaluation failed");
      }

      const data = await response.json();

      // Update state directly from the response
      setTranscript((prev) => ({
        ...prev,
        eval_status: "completed",
        summary: data.summary,
        eval_cost_usd: data.costUsd ?? prev.eval_cost_usd,
      }));

      // Map the response results to our format
      if (data.results && Array.isArray(data.results)) {
        const mapped: EvalResultWithCriteria[] = data.results.map(
          (r: {
            criteria_id: string;
            criteria_name: string;
            passed: boolean;
            confidence: number;
            reasoning: string;
            excerpt: string;
            excerpt_start: number;
            excerpt_end: number;
          }) => ({
            id: crypto.randomUUID(),
            transcript_id: transcript.id,
            eval_criteria_id: r.criteria_id,
            passed: r.passed,
            confidence: r.confidence,
            reasoning: r.reasoning,
            transcript_excerpt: r.excerpt,
            excerpt_start_index: r.excerpt_start,
            excerpt_end_index: r.excerpt_end,
            eval_run_id: data.evalRunId,
            created_at: new Date().toISOString(),
            eval_criteria: { name: r.criteria_name, category: null },
          })
        );
        setEvalResults(mapped);
      }

      setEvaluating(false);
      toast.success("Evaluation complete!");
    } catch (err) {
      console.error("Eval error:", err);
      setTranscript((prev) => ({ ...prev, eval_status: "failed" }));
      setEvaluating(false);
      toast.error(
        err instanceof Error ? err.message : "Evaluation failed. Please try again."
      );
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/transcripts/${transcript.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Transcript deleted");
      router.push(`/org/${orgId}/transcripts`);
    } catch {
      toast.error("Failed to delete transcript");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const headerContent = (
    <div className="space-y-3">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/org/${orgId}/transcripts`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Transcript</DialogTitle>
                <DialogDescription>
                  This will permanently delete this transcript and all associated
                  evaluation results. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className={source.className}>
          <SourceIcon className="mr-1 h-3 w-3" />
          {source.label}
        </Badge>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
        {transcript.technicians && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {transcript.technicians.name}
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(transcript.created_at)}
        </span>
        {transcript.service_type && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            {transcript.service_type}
          </span>
        )}
        {transcript.location && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {transcript.location}
          </span>
        )}
        {transcript.audio_duration_seconds && (
          <span className="text-muted-foreground">
            {formatDuration(transcript.audio_duration_seconds)}
          </span>
        )}
      </div>

      {/* Summary */}
      {transcript.summary ? (
        <Card>
          <CardContent className="py-3 text-sm">{transcript.summary}</CardContent>
        </Card>
      ) : evaluating ? (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating summary...
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Summary will appear after evaluation.
        </p>
      )}
    </div>
  );

  const transcriptPanel = (
    <div className="space-y-4">
      {transcript.audio_url && <AudioPlayer src={transcript.audio_url} />}

      {diarized && diarized.length > 0 ? (
        <div className="space-y-2">
          {diarized.map((segment, i) => {
            const colorClass =
              SPEAKER_COLORS[segment.speaker % SPEAKER_COLORS.length];
            return (
              <div
                key={i}
                className="flex gap-3"
                data-start={segment.start}
                data-end={segment.end}
              >
                <div
                  className={`shrink-0 w-20 text-xs font-medium rounded px-2 py-1 border ${colorClass} text-center`}
                >
                  Speaker {segment.speaker + 1}
                </div>
                <p className="text-sm leading-relaxed flex-1">{segment.text}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {transcript.raw_transcript}
        </div>
      )}
    </div>
  );

  const evalPanel = (
    <div className="space-y-4">
      {/* Score circle */}
      {evalResults.length > 0 ? (
        <div className="flex flex-col items-center py-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/30"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={`${(passedCount / totalCount) * 251.3} 251.3`}
                strokeLinecap="round"
                className={
                  passedCount / totalCount >= 0.8
                    ? "text-green-500"
                    : passedCount / totalCount >= 0.5
                    ? "text-amber-500"
                    : "text-red-500"
                }
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold">
                {passedCount}/{totalCount}
              </span>
              <span className="text-xs text-muted-foreground">passed</span>
            </div>
          </div>
          {transcript.eval_cost_usd != null && transcript.eval_cost_usd > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Eval cost: {formatCost(transcript.eval_cost_usd)}
            </p>
          )}
        </div>
      ) : evaluating ? (
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-amber-600">
            Running AI evaluation...
          </p>
          <p className="text-xs text-muted-foreground">
            This may take 15-30 seconds
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/30"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              —
            </div>
          </div>
        </div>
      )}

      {/* Results list */}
      {evalResults.length > 0 ? (
        <div className="space-y-2">
          {evalResults.map((result) => (
            <div key={result.id} className="rounded-md border">
              <button
                onClick={() =>
                  setExpandedResult(
                    expandedResult === result.id ? null : result.id
                  )
                }
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors"
              >
                {result.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {result.eval_criteria?.name || "Unknown Criterion"}
                </span>
                {result.eval_criteria?.category && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {result.eval_criteria.category}
                  </Badge>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                    expandedResult === result.id ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedResult === result.id && (
                <div className="border-t px-3 pb-3 pt-2 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {result.reasoning}
                  </p>
                  {result.transcript_excerpt && (
                    <div className="rounded bg-amber-50 border border-amber-200 p-2">
                      <p className="text-xs font-medium text-amber-700 mb-1">
                        Evidence
                      </p>
                      <p className="text-xs text-amber-900 italic">
                        &ldquo;{result.transcript_excerpt}&rdquo;
                      </p>
                    </div>
                  )}
                  {result.confidence != null && (
                    <p className="text-xs text-muted-foreground">
                      Confidence: {Math.round(result.confidence * 100)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !evaluating ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground text-sm">
              {transcript.eval_status === "failed"
                ? "Evaluation failed. Click below to try again."
                : "No evaluation results yet."}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={runEvaluation}
              disabled={evaluating}
            >
              <Play className="mr-2 h-4 w-4" />
              Run Evaluation
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Re-run button (when results exist) */}
      {evalResults.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={runEvaluation}
          disabled={evaluating}
        >
          {evaluating ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Re-running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-3.5 w-3.5" />
              Re-run Evaluation
            </>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {headerContent}

      {/* Desktop: split panel */}
      <div className="hidden md:grid md:grid-cols-5 md:gap-6">
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transcript</CardTitle>
            </CardHeader>
            <CardContent>{transcriptPanel}</CardContent>
          </Card>
        </div>
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Evaluation</CardTitle>
            </CardHeader>
            <CardContent>{evalPanel}</CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile: tabbed */}
      <div className="md:hidden">
        <Tabs defaultValue="transcript">
          <TabsList className="w-full">
            <TabsTrigger value="transcript" className="flex-1">
              Transcript
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex-1">
              Evaluation
              {evalResults.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {passedCount}/{totalCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transcript" className="mt-4">
            {transcriptPanel}
          </TabsContent>
          <TabsContent value="evaluation" className="mt-4">
            {evalPanel}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

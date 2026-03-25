"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CALL_TYPES, getIntents, getOutcomes } from "@/lib/call-taxonomy";

const SERVICE_TYPE_SUGGESTIONS: Record<string, string> = {
  hvac: "e.g., AC repair, furnace install, maintenance plan",
  plumbing: "e.g., drain cleaning, water heater, leak repair",
  electrical: "e.g., panel upgrade, outlet install, inspection",
  general: "e.g., service call, consultation, follow-up",
};

interface Props {
  orgId: string;
  technicians: Array<{ id: string; name: string; role: string | null }>;
  industry: string;
}

export function PasteForm({ orgId, technicians, industry }: Props) {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [callType, setCallType] = useState("");
  const [callIntent, setCallIntent] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const intentOptions = getIntents(callType);
  const outcomeOptions = getOutcomes(callType);

  function handleCallTypeChange(val: string) {
    setCallType(val);
    setCallIntent("");
    setCallOutcome("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          technicianId: technicianId || null,
          rawTranscript: transcript.trim(),
          serviceType: serviceType || null,
          location: location || null,
          callType: callType || null,
          callIntent: callIntent || null,
          callOutcome: callOutcome || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create transcript");
      }

      const data = await response.json();
      toast.success("Transcript created successfully!");
      router.push(`/org/${orgId}/transcripts/${data.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit transcript"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="transcript">Call Transcript</Label>
        <Textarea
          id="transcript"
          placeholder="Paste your call transcript here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          className="resize-y min-h-[200px] font-mono text-sm"
        />
        {transcript.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {transcript.length.toLocaleString()} characters
          </p>
        )}
      </div>

      {technicians.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="technician">Technician</Label>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="service-type">Service Type</Label>
          <Input
            id="service-type"
            placeholder={
              SERVICE_TYPE_SUGGESTIONS[industry] ||
              SERVICE_TYPE_SUGGESTIONS.general
            }
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Optional"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="call-type">Call Type</Label>
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
          <Label htmlFor="call-intent">Intent</Label>
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
        <div className="space-y-1.5">
          <Label htmlFor="call-outcome">Outcome</Label>
          <Select value={callOutcome} onValueChange={setCallOutcome} disabled={!callType}>
            <SelectTrigger id="call-outcome">
              <SelectValue placeholder={callType ? "What happened?" : "Select call type first"} />
            </SelectTrigger>
            <SelectContent>
              {outcomeOptions.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!transcript.trim() || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Analyze Transcript
          </>
        )}
      </Button>
    </form>
  );
}

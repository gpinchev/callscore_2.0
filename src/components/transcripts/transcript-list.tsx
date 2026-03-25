"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Mic,
  FileText,
  Plus,
  ClipboardPaste,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CALL_TAXONOMY, CALL_TYPES, ALL_INTENTS, ALL_OUTCOMES } from "@/lib/call-taxonomy";
import type { Transcript } from "@/lib/supabase/types";

// ── Mock data fill ────────────────────────────────────────────
const MOCK_CUSTOMERS = [
  "James Carter", "Maria Lopez", "David Kim", "Sarah Johnson", "Michael Brown",
  "Emily Davis", "Robert Wilson", "Jessica Martinez", "William Anderson", "Ashley Thomas",
  "Christopher Jackson", "Amanda White", "Matthew Harris", "Stephanie Taylor", "Joshua Moore",
  "Nicole Martin", "Andrew Garcia", "Melissa Robinson", "Daniel Clark", "Lauren Lewis",
];

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

const MOCK_CALL_ROWS = [
  { date: "Mar 21, 2025", time: "9:14 AM", callType: "Service", intent: "Schedule Service", outcome: "Appointment Booked", csr: "Marcus Rivera", customer: "Linda Foster", preview: "Hi, I'd like to schedule a furnace tune-up before the cold weather hits this season…" },
  { date: "Mar 20, 2025", time: "2:47 PM", callType: "Sales", intent: "New Installation Quote", outcome: "Quote Sent", csr: "Priya Patel", customer: "Tom Nguyen", preview: "We just moved in and the old AC unit is really struggling. Can I get a quote for a replacement…" },
  { date: "Mar 20, 2025", time: "11:03 AM", callType: "Service", intent: "Emergency Repair", outcome: "Same-Day Dispatch", csr: "Marcus Rivera", customer: "Carol Williams", preview: "The heat went out last night and we have a newborn. This is really urgent for us…" },
  { date: "Mar 19, 2025", time: "4:22 PM", callType: "Billing", intent: "Billing Dispute", outcome: "Escalated to Manager", csr: "Sarah Chen", customer: "Robert Hall", preview: "I received my invoice and it's almost double what I was quoted. I need someone to explain this…" },
  { date: "Mar 19, 2025", time: "10:11 AM", callType: "Service", intent: "Follow-Up Check", outcome: "Customer Satisfied", csr: "James Okafor", customer: "Patricia Adams", preview: "Just calling to see if everything is still working well after the repair last week…" },
  { date: "Mar 18, 2025", time: "3:05 PM", callType: "Sales", intent: "Maintenance Plan Upsell", outcome: "Plan Purchased", csr: "Priya Patel", customer: "Kevin Martinez", preview: "Actually that annual plan sounds like a great deal. Can we go ahead and set that up today…" },
  { date: "Mar 18, 2025", time: "9:48 AM", callType: "Service", intent: "Schedule Service", outcome: "Appointment Booked", csr: "Sarah Chen", customer: "Michelle Brown", preview: "My dishwasher is making a loud grinding noise whenever I run it. When can someone come look…" },
  { date: "Mar 17, 2025", time: "1:30 PM", callType: "Service", intent: "Warranty Claim", outcome: "Claim Approved", csr: "James Okafor", customer: "Daniel Lee", preview: "The part that was replaced six months ago is failing again and I believe it's still under warranty…" },
  { date: "Mar 17, 2025", time: "10:55 AM", callType: "Billing", intent: "Payment Arrangement", outcome: "Payment Plan Set", csr: "Marcus Rivera", customer: "Angela Thompson", preview: "I can't pay the full amount right now but I'd like to set up a payment plan if that's possible…" },
  { date: "Mar 16, 2025", time: "2:15 PM", callType: "Sales", intent: "New Installation Quote", outcome: "Appointment Booked", csr: "Priya Patel", customer: "Brian Scott", preview: "We're remodeling the kitchen and want to upgrade to a tankless water heater. What are my options…" },
  { date: "Mar 15, 2025", time: "11:40 AM", callType: "Service", intent: "Emergency Repair", outcome: "Same-Day Dispatch", csr: "Sarah Chen", customer: "Nancy Wilson", preview: "There's water dripping from the ceiling in my living room. I think the AC is leaking above it…" },
  { date: "Mar 14, 2025", time: "8:52 AM", callType: "Service", intent: "Schedule Service", outcome: "Appointment Booked", csr: "James Okafor", customer: "Steven Clark", preview: "I'd like to get my annual AC inspection done before the summer season starts this year…" },
];

function fillMockFields(t: TranscriptWithTechnician): TranscriptWithTechnician {
  if (t.call_type && t.call_intent && t.call_outcome && t.customers) return t;
  const h = idHash(t.id);
  const callType = t.call_type ?? pick(CALL_TYPES, h);
  const taxonomy = CALL_TAXONOMY[callType as keyof typeof CALL_TAXONOMY];
  const callIntent = t.call_intent ?? pick(taxonomy?.intents ?? ["General Inquiry"], h * 7);
  const callOutcome = t.call_outcome ?? pick(taxonomy?.outcomes ?? ["No Action Needed"], h * 13);
  const customers = t.customers ?? { name: pick(MOCK_CUSTOMERS, h * 3) };
  return { ...t, call_type: callType, call_intent: callIntent, call_outcome: callOutcome, customers };
}

type TranscriptWithTechnician = Transcript & {
  technicians: { name: string } | null;
  customers: { name: string } | null;
  call_type?: string | null;
  call_intent?: string | null;
  call_outcome?: string | null;
};

interface Props {
  orgId: string;
  transcripts: TranscriptWithTechnician[];
  technicians: Array<{ id: string; name: string }>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

export function TranscriptList({ orgId, transcripts, technicians }: Props) {
  const [callTypeFilter, setCallTypeFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");

  const displayTranscripts = useMemo(() => transcripts.map(fillMockFields), [transcripts]);

  const filtered = useMemo(() => {
    return displayTranscripts.filter((t) => {
      if (callTypeFilter !== "all" && t.call_type !== callTypeFilter) return false;
      if (intentFilter !== "all" && t.call_intent !== intentFilter) return false;
      if (outcomeFilter !== "all" && t.call_outcome !== outcomeFilter) return false;
      if (techFilter !== "all" && t.technician_id !== techFilter) return false;
      return true;
    });
  }, [displayTranscripts, callTypeFilter, intentFilter, outcomeFilter, techFilter]);

  const isMockMode = transcripts.length === 0;

  if (isMockMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Calls</h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              Sample data — add your first call to see real results
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Call Recording
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/org/${orgId}/record`} className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Record
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/org/${orgId}/paste`} className="flex items-center gap-2">
                    <ClipboardPaste className="h-4 w-4" />
                    Paste
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Call Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Intent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">CSR</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_CALL_ROWS.map((row, i) => (
                <tr key={i} className="opacity-70">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{row.date}</div>
                    <div className="text-xs text-gray-400">{row.time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">{row.callType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-violet-200 bg-violet-50 text-violet-700">{row.intent}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">{row.outcome}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.csr}</td>
                  <td className="px-4 py-3 text-gray-700">{row.customer}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="truncate text-gray-800">{row.preview}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calls</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Call Recording
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/org/${orgId}/record`} className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Record
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/org/${orgId}/paste`} className="flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4" />
                Paste
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
          <SelectTrigger className="w-[170px] h-8 text-xs">
            <SelectValue placeholder="Call Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All call types</SelectItem>
            {CALL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All intents</SelectItem>
            {ALL_INTENTS.map((i) => (
              <SelectItem key={i} value={i}>{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            {ALL_OUTCOMES.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {technicians.length > 0 && (
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="CSR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CSRs</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(callTypeFilter !== "all" || intentFilter !== "all" || outcomeFilter !== "all" || techFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => { setCallTypeFilter("all"); setIntentFilter("all"); setOutcomeFilter("all"); setTechFilter("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Call Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Intent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Outcome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">CSR</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((t) => {
              const { date, time } = formatDate(t.created_at);
              const callType = t.call_type;
              const callIntent = t.call_intent;
              const callOutcome = t.call_outcome;

              return (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/org/${orgId}/transcripts/${t.id}`}
                >
                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{date}</div>
                    <div className="text-xs text-gray-400">{time}</div>
                  </td>

                  {/* Call Type */}
                  <td className="px-4 py-3">
                    {callType ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">
                        {callType}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Intent */}
                  <td className="px-4 py-3">
                    {callIntent ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-violet-200 bg-violet-50 text-violet-700">
                        {callIntent}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Outcome */}
                  <td className="px-4 py-3">
                    {callOutcome ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
                        {callOutcome}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* CSR */}
                  <td className="px-4 py-3">
                    <span className="truncate text-gray-700">{t.technicians?.name || <span className="text-gray-400">Unassigned</span>}</span>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    {t.customers?.name
                      ? <span className="truncate text-gray-700">{t.customers.name}</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>

                  {/* Preview */}
                  <td className="px-4 py-3 max-w-xs">
                    <div className="truncate text-gray-800">
                      {t.raw_transcript.slice(0, 80)}{t.raw_transcript.length > 80 ? "…" : ""}
                    </div>
                    {t.service_type && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{t.service_type}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            No calls match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

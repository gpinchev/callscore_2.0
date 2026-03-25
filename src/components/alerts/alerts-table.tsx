"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type AlertRow = {
  id: string;
  transcriptId: string | null;
  criterion: string;
  csr: string;
  date: string;
  reasoning: string;
  callType: string;
  intent: string;
  outcome: string;
};

interface Props {
  orgId: string;
  alerts: AlertRow[];
  isMock: boolean;
  criteriaCount: number;
}

export function AlertsTable({ orgId, alerts, isMock }: Props) {
  const router = useRouter();
  const [callTypeFilter, setCallTypeFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [csrFilter, setCsrFilter] = useState("all");

  const callTypes = useMemo(
    () => [...new Set(alerts.map((a) => a.callType).filter(Boolean))].sort(),
    [alerts]
  );
  const intents = useMemo(
    () => [...new Set(alerts.map((a) => a.intent).filter(Boolean))].sort(),
    [alerts]
  );
  const outcomes = useMemo(
    () => [...new Set(alerts.map((a) => a.outcome).filter(Boolean))].sort(),
    [alerts]
  );
  const csrs = useMemo(
    () => [...new Set(alerts.map((a) => a.csr).filter(Boolean))].sort(),
    [alerts]
  );

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (callTypeFilter !== "all" && a.callType !== callTypeFilter) return false;
        if (intentFilter !== "all" && a.intent !== intentFilter) return false;
        if (outcomeFilter !== "all" && a.outcome !== outcomeFilter) return false;
        if (csrFilter !== "all" && a.csr !== csrFilter) return false;
        return true;
      }),
    [alerts, callTypeFilter, intentFilter, outcomeFilter, csrFilter]
  );

  const anyFilter =
    callTypeFilter !== "all" || intentFilter !== "all" || outcomeFilter !== "all" || csrFilter !== "all";

  return (
    <div className="space-y-3">
      {isMock && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          Sample data — enable &ldquo;Notify when failed&rdquo; on eval criteria to see real alerts
        </span>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
          <SelectTrigger className="w-[170px] h-8 text-xs">
            <SelectValue placeholder="Call Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All call types</SelectItem>
            {callTypes.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All intents</SelectItem>
            {intents.map((i) => (
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
            {outcomes.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={csrFilter} onValueChange={setCsrFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="CSR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CSRs</SelectItem>
            {csrs.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {anyFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setCallTypeFilter("all");
              setIntentFilter("all");
              setOutcomeFilter("all");
              setCsrFilter("all");
            }}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Call Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Criterion</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Intent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Outcome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">CSR</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reasoning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  No alerts match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((alert) => (
                <tr
                  key={alert.id}
                  className={`transition-colors ${
                    alert.transcriptId && !isMock
                      ? "hover:bg-gray-50 cursor-pointer"
                      : "opacity-70"
                  }`}
                  onClick={() => {
                    if (alert.transcriptId && !isMock) {
                      router.push(`/org/${orgId}/transcripts/${alert.transcriptId}`);
                    }
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                    {alert.date}
                  </td>
                  <td className="px-4 py-3">
                    {alert.callType ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">
                        {alert.callType}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="font-medium text-gray-800">{alert.criterion}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {alert.intent ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-violet-200 bg-violet-50 text-violet-700">
                        {alert.intent}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {alert.outcome ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
                        {alert.outcome}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{alert.csr || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <p className="truncate">{alert.reasoning || "—"}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

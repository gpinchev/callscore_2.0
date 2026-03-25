import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_ALERT_ROWS = [
  { date: "Mar 21, 2025 · 9:14 AM", criterion: "Greeting & Proper Introduction", csr: "Marcus Rivera", reasoning: "Agent did not introduce themselves by name at the start of the call. Call began with 'How can I help you?' without proper greeting." },
  { date: "Mar 20, 2025 · 2:47 PM", criterion: "Empathy & Active Listening", csr: "Priya Patel", reasoning: "Customer expressed frustration about a billing error and agent proceeded without acknowledging the inconvenience." },
  { date: "Mar 19, 2025 · 4:22 PM", criterion: "Offer Maintenance Plan", csr: "Sarah Chen", reasoning: "Service appointment was confirmed but no attempt was made to upsell the annual maintenance plan to the customer." },
  { date: "Mar 18, 2025 · 11:03 AM", criterion: "Confirm Appointment Details", csr: "James Okafor", reasoning: "Appointment was scheduled but agent did not repeat back the date, time, and address to confirm accuracy with the customer." },
  { date: "Mar 17, 2025 · 3:05 PM", criterion: "Closing & Next Steps", csr: "Marcus Rivera", reasoning: "Call ended without summarizing what was agreed upon or informing the customer of expected follow-up timeline." },
];

export const metadata: Metadata = { title: "Alerts" };

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  // Fetch criteria that have notify_on_fail = true
  const { data: notifyCriteria } = await supabase
    .from("eval_criteria")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("notify_on_fail", true);

  const criteriaIds = (notifyCriteria ?? []).map((c) => c.id);
  const criteriaNames = Object.fromEntries(
    (notifyCriteria ?? []).map((c) => [c.id, c.name])
  );

  // Fetch failed eval results for those criteria
  const { data: failedResults } = criteriaIds.length > 0
    ? await supabase
        .from("eval_results")
        .select("id, transcript_id, eval_criteria_id, reasoning, transcript_excerpt, created_at, transcripts(id, created_at, raw_transcript, technicians(name))")
        .in("eval_criteria_id", criteriaIds)
        .eq("passed", false)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const alerts = failedResults ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Eval criteria marked &ldquo;Notify when failed&rdquo; that did not pass.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5">
          <Bell className="h-3 w-3" />
          {criteriaIds.length} criteria monitored
        </Badge>
      </div>

      {criteriaIds.length === 0 || alerts.length === 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              Sample data — enable &ldquo;Notify when failed&rdquo; on eval criteria to see real alerts
            </span>
          </div>
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Criterion</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">CSR</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_ALERT_ROWS.map((row, i) => (
                  <tr key={i} className="opacity-70">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{row.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <span className="font-medium text-gray-800">{row.criterion}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.csr}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-sm">
                      <p className="truncate">{row.reasoning}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Criterion</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">CSR</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.map((alert) => {
                const tx = alert.transcripts as unknown as {
                  id: string;
                  created_at: string;
                  raw_transcript: string;
                  technicians: { name: string } | null;
                } | null;
                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/org/${orgId}/transcripts/${alert.transcript_id}`)
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {tx ? formatDate(tx.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <span className="font-medium text-gray-800">
                          {criteriaNames[alert.eval_criteria_id] ?? "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tx?.technicians?.name ?? <span className="text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-sm">
                      <p className="truncate">{alert.reasoning ?? "—"}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

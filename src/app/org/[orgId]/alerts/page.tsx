import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

      {criteriaIds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-medium mb-2">No criteria being monitored</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              Enable &ldquo;Notify when failed&rdquo; on any eval criterion in{" "}
              <Link href={`/org/${orgId}/settings`} className="underline underline-offset-2">
                Settings
              </Link>{" "}
              to start tracking failures here.
            </p>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-4" />
            <h2 className="text-lg font-medium mb-2">No failures yet</h2>
            <p className="text-muted-foreground text-sm">
              All monitored criteria are passing.
            </p>
          </CardContent>
        </Card>
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

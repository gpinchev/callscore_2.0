import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertsTable, type AlertRow } from "@/components/alerts/alerts-table";

const MOCK_ALERT_ROWS: AlertRow[] = [
  { id: "mock-1", transcriptId: null, date: "Mar 21, 2025 · 9:14 AM", criterion: "Greeting & Proper Introduction", csr: "Marcus Rivera", callType: "Service", intent: "Schedule Service", outcome: "Appointment Booked", reasoning: "Agent did not introduce themselves by name at the start of the call. Call began with 'How can I help you?' without proper greeting." },
  { id: "mock-2", transcriptId: null, date: "Mar 20, 2025 · 2:47 PM", criterion: "Empathy & Active Listening", csr: "Priya Patel", callType: "Billing", intent: "Billing Inquiry", outcome: "Issue Resolved", reasoning: "Customer expressed frustration about a billing error and agent proceeded without acknowledging the inconvenience." },
  { id: "mock-3", transcriptId: null, date: "Mar 19, 2025 · 4:22 PM", criterion: "Offer Maintenance Plan", csr: "Sarah Chen", callType: "Sales", intent: "Maintenance Plan Upsell", outcome: "Appointment Booked", reasoning: "Service appointment was confirmed but no attempt was made to upsell the annual maintenance plan to the customer." },
  { id: "mock-4", transcriptId: null, date: "Mar 18, 2025 · 11:03 AM", criterion: "Confirm Appointment Details", csr: "James Okafor", callType: "Service", intent: "Schedule Service", outcome: "Appointment Booked", reasoning: "Appointment was scheduled but agent did not repeat back the date, time, and address to confirm accuracy with the customer." },
  { id: "mock-5", transcriptId: null, date: "Mar 17, 2025 · 3:05 PM", criterion: "Closing & Next Steps", csr: "Marcus Rivera", callType: "Service", intent: "Follow-Up Check", outcome: "No Resolution", reasoning: "Call ended without summarizing what was agreed upon or informing the customer of expected follow-up timeline." },
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

  let criteriaIds: string[] = [];
  let criteriaNames: Record<string, string> = {};
  let alertRows: AlertRow[] = [];

  try {
    const supabase = createServerClient();

    const { data: notifyCriteria } = await supabase
      .from("eval_criteria")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("notify_on_fail", true);

    criteriaIds = (notifyCriteria ?? []).map((c) => c.id);
    criteriaNames = Object.fromEntries(
      (notifyCriteria ?? []).map((c) => [c.id, c.name])
    );

    if (criteriaIds.length > 0) {
      const { data: failedResults } = await supabase
        .from("eval_results")
        .select("id, transcript_id, eval_criteria_id, reasoning, created_at, transcripts(id, created_at, call_type, call_intent, call_outcome, technicians(name))")
        .in("eval_criteria_id", criteriaIds)
        .eq("passed", false)
        .order("created_at", { ascending: false })
        .limit(100);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alertRows = (failedResults ?? []).map((alert: any) => {
        const tx = alert.transcripts as {
          id: string;
          created_at: string;
          call_type: string | null;
          call_intent: string | null;
          call_outcome: string | null;
          technicians: { name: string } | null;
        } | null;
        return {
          id: alert.id,
          transcriptId: alert.transcript_id ?? null,
          criterion: criteriaNames[alert.eval_criteria_id] ?? "Unknown",
          csr: tx?.technicians?.name ?? "",
          date: tx ? formatDate(tx.created_at) : "—",
          reasoning: alert.reasoning ?? "",
          callType: tx?.call_type ?? "",
          intent: tx?.call_intent ?? "",
          outcome: tx?.call_outcome ?? "",
        };
      });
    }
  } catch {
    // Supabase unavailable — show mock alerts below
  }

  const isMock = alertRows.length === 0;
  const displayRows = isMock ? MOCK_ALERT_ROWS : alertRows;

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

      <AlertsTable
        orgId={orgId}
        alerts={displayRows}
        isMock={isMock}
        criteriaCount={criteriaIds.length}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { NeedsAttentionItem } from "@/lib/dashboard-types";

interface Props {
  data: NeedsAttentionItem[];
  orgId: string;
}

function getPassRateColor(rate: number | null): string {
  if (rate === null) return "bg-gray-100 text-gray-700";
  if (rate >= 0.8) return "bg-green-50 text-green-700 border-green-200";
  if (rate >= 0.5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function AttentionList({ data, orgId }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
        <p className="text-sm font-medium">
          All recent evaluations are looking good!
        </p>
        <p className="text-xs text-muted-foreground">
          No transcripts with pass rates below 50%
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">CSR</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">
              Service Type
            </th>
            <th className="px-3 py-2 font-medium">Pass Rate</th>
            <th className="px-3 py-2 font-medium">Score</th>
            <th className="px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.transcriptId} className="border-b last:border-0">
              <td className="px-3 py-2 text-muted-foreground">
                {formatDistanceToNow(new Date(item.date), {
                  addSuffix: true,
                })}
              </td>
              <td className="px-3 py-2 font-medium">
                {item.technicianName}
              </td>
              <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                {item.serviceType || "--"}
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant="outline"
                  className={getPassRateColor(item.passRate)}
                >
                  {item.passRate !== null
                    ? `${Math.round(item.passRate * 100)}%`
                    : "--"}
                </Badge>
              </td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                {item.passed}/{item.total}
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/org/${orgId}/transcripts/${item.transcriptId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 px-3 pb-2">
        <Link
          href={`/org/${orgId}/transcripts`}
          className="text-xs font-medium text-primary hover:underline"
        >
          View all transcripts
        </Link>
      </div>
    </div>
  );
}

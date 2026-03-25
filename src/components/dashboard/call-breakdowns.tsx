"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CallBreakdowns } from "@/lib/dashboard-types";

interface Props {
  data: CallBreakdowns;
}

export function CallBreakdownsCard({ data }: Props) {
  const hasAny =
    data.byType.length > 0 ||
    data.byIntent.length > 0 ||
    data.byOutcome.length > 0;

  return (
    <>
      {/* Call Type Breakdown — bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Call Type Breakdown
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Number of calls by caller type
          </p>
        </CardHeader>
        <CardContent>
          {data.byType.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No call type data for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, data.byType.length * 44)}>
              <BarChart
                data={data.byType.map((d) => ({ name: d.label, count: d.count }))}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 12, fill: "#374151" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [value, "Calls"]}
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
                  {data.byType.map((_, i) => (
                    <Cell key={i} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Call Intent — data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Call Intent</CardTitle>
          <p className="text-xs text-muted-foreground">Why callers are reaching out</p>
        </CardHeader>
        <CardContent className="p-0">
          {data.byIntent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No call intent data for this period.
            </p>
          ) : (
            <IntentTable items={data.byIntent} />
          )}
        </CardContent>
      </Card>

      {/* Call Outcome — proportional list */}
      {data.byOutcome.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Call Outcome</CardTitle>
            <p className="text-xs text-muted-foreground">How calls resolved</p>
          </CardHeader>
          <CardContent>
            <BreakdownList items={data.byOutcome} color="emerald" />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function IntentTable({ items }: { items: { label: string; count: number }[] }) {
  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            Call Intent
          </th>
          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">
            Calls
          </th>
          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-20">
            % of Total
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map(({ label, count }) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <tr key={label} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm text-gray-800">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                  {label}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-violet-700">
                {count}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                {pct.toFixed(1)}%
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t bg-gray-50">
          <td className="px-4 py-2.5 text-xs font-medium text-gray-500">Total</td>
          <td className="px-4 py-2.5 text-right text-xs font-medium tabular-nums text-gray-700">{total}</td>
          <td className="px-4 py-2.5 text-right text-xs text-gray-400">100%</td>
        </tr>
      </tfoot>
    </table>
  );
}

const COLOR_MAP = {
  violet:  { bar: "bg-violet-500",  text: "text-violet-700"  },
  emerald: { bar: "bg-emerald-500", text: "text-emerald-700" },
};

function BreakdownList({
  items,
  color,
}: {
  items: { label: string; count: number }[];
  color: keyof typeof COLOR_MAP;
}) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  const { bar, text } = COLOR_MAP[color];

  return (
    <ul className="space-y-2.5">
      {items.map(({ label, count }) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <li key={label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-gray-700 truncate max-w-[75%]">{label}</span>
              <span className={`text-xs font-medium tabular-nums ${text}`}>{count}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

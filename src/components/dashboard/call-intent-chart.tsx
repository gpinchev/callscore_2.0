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
import type { CallIntentCount } from "@/lib/dashboard-types";

interface Props {
  data: CallIntentCount[];
  color?: string;
}

export function CallIntentChart({ data, color = "#7c3aed" }: Props) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart
        data={data.map((d) => ({ name: d.label, count: d.count }))}
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
          width={160}
          tick={{ fontSize: 12, fill: "#374151" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [value, "Calls"]}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={0.75 + (i === 0 ? 0.25 : 0)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

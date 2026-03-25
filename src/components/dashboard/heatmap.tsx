"use client";

import Link from "next/link";
import type { HeatmapCell } from "@/lib/dashboard-types";

interface Props {
  data: HeatmapCell[];
  orgId: string;
}

function getCellClasses(passRate: number | null): string {
  if (passRate === null)
    return "bg-gray-100 dark:bg-gray-800 text-gray-400";
  if (passRate >= 0.8)
    return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300";
  if (passRate >= 0.5)
    return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
  return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
}

export function Heatmap({ data, orgId }: Props) {
  // Extract unique technicians and criteria from data
  const techMap = new Map<string, string>();
  const criteriaMap = new Map<string, string>();

  for (const cell of data) {
    techMap.set(cell.technicianId, cell.technicianName);
    criteriaMap.set(cell.criteriaId, cell.criteriaName);
  }

  const technicians = [...techMap.entries()].map(([id, name]) => ({
    id,
    name,
  }));
  const criteria = [...criteriaMap.entries()].map(([id, name]) => ({
    id,
    name,
  }));

  // Sort technicians by overall pass rate (calculated from all their cells)
  const techPassRates = technicians.map((tech) => {
    const techCells = data.filter(
      (c) => c.technicianId === tech.id && c.passRate !== null
    );
    const avg =
      techCells.length > 0
        ? techCells.reduce((sum, c) => sum + (c.passRate ?? 0), 0) /
          techCells.length
        : -1;
    return { ...tech, avgPassRate: avg };
  });
  const sortedTechs = [...techPassRates].sort((a, b) => b.avgPassRate - a.avgPassRate);

  if (technicians.length === 0 || criteria.length === 0) {
    return null;
  }

  // Build lookup map for O(1) cell access
  const cellLookup = new Map<string, HeatmapCell>();
  for (const cell of data) {
    cellLookup.set(`${cell.technicianId}:${cell.criteriaId}`, cell);
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
              CSR
            </th>
            {criteria.map((c) => (
              <th
                key={c.id}
                className="min-w-[80px] px-2 py-2 text-center font-medium text-muted-foreground"
              >
                <span
                  className="inline-block max-w-[100px] truncate"
                  title={c.name}
                >
                  {c.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTechs.map((tech) => (
            <tr key={tech.id} className="border-t">
              <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium">
                <Link
                  href={`/org/${orgId}/technicians/${tech.id}`}
                  className="hover:underline"
                >
                  {tech.name}
                </Link>
              </td>
              {criteria.map((c) => {
                const cell = cellLookup.get(`${tech.id}:${c.id}`);
                const passRate = cell?.passRate ?? null;

                return (
                  <td key={c.id} className="px-1 py-1 text-center">
                    <Link
                      href={`/org/${orgId}/transcripts?technicianId=${tech.id}&criteriaId=${c.id}`}
                      className={`flex items-center justify-center rounded px-2 py-2 text-xs font-medium transition-opacity hover:opacity-80 ${getCellClasses(passRate)}`}
                    >
                      {passRate !== null
                        ? `${Math.round(passRate * 100)}%`
                        : "--"}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

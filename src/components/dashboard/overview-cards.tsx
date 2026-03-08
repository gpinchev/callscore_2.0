"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "./sparkline";
import type { DashboardOverview, SparklinePoint } from "@/lib/dashboard-types";

function formatCost(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

interface Props {
  overview: DashboardOverview;
  sparklineData: SparklinePoint[];
  orgId: string;
  onFilterByCriteria?: (criteriaId: string) => void;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }

  const pct = Math.round(value * 100);
  const isPositive = pct > 0;
  const isNeutral = pct === 0;

  if (isNeutral) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${
        isPositive ? "text-green-600" : "text-red-600"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? "+" : ""}
      {pct}% vs prior period
    </span>
  );
}

export function OverviewCards({
  overview,
  sparklineData,
  orgId,
  onFilterByCriteria,
}: Props) {
  const passRateSparkline = sparklineData.map((d) => ({
    value: d.passRate !== null ? Math.round(d.passRate * 100) : null,
  }));

  const evalSparkline = sparklineData.map((d) => ({
    value: d.evaluations,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Overall Pass Rate */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Overall Pass Rate
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {overview.overallPassRate !== null
              ? `${Math.round(overview.overallPassRate * 100)}%`
              : "--"}
          </p>
          <DeltaBadge value={overview.passRateChange} />
          <div className="mt-2">
            <Sparkline data={passRateSparkline} color="#7c3aed" />
          </div>
        </CardContent>
      </Card>

      {/* Total Evaluations */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total Evaluations
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {overview.totalEvaluations}
          </p>
          <p className="text-xs text-muted-foreground">
            {overview.totalTranscripts} transcript
            {overview.totalTranscripts !== 1 ? "s" : ""}
          </p>
          {overview.totalCost !== null && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <DollarSign className="h-3 w-3" />
              {formatCost(overview.totalCost)} total
              {overview.avgCostPerEval !== null && (
                <span className="ml-1">
                  ({formatCost(overview.avgCostPerEval)}/eval)
                </span>
              )}
            </p>
          )}
          <div className="mt-2">
            <Sparkline data={evalSparkline} color="#6366f1" />
          </div>
        </CardContent>
      </Card>

      {/* Most Improved Technician */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Most Improved
          </p>
          {overview.mostImprovedTechnician ? (
            <>
              <Link
                href={`/org/${orgId}/technicians/${overview.mostImprovedTechnician.id}`}
                className="mt-1 block text-xl font-semibold hover:underline"
              >
                {overview.mostImprovedTechnician.name}
              </Link>
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />+
                {Math.round(overview.mostImprovedTechnician.improvement * 100)}%
              </span>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Not enough data yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Weakest Criteria */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Weakest Criteria
          </p>
          {overview.weakestCriterion ? (
            <>
              <button
                onClick={() =>
                  onFilterByCriteria?.(overview.weakestCriterion!.id)
                }
                className="mt-1 block text-left text-xl font-semibold hover:underline"
              >
                {overview.weakestCriterion.name}
              </button>
              <span className="text-sm font-medium text-red-600">
                {overview.weakestCriterion.failRate !== null
                  ? `${Math.round(overview.weakestCriterion.failRate * 100)}% fail rate`
                  : "No data"}
              </span>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Not enough data yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

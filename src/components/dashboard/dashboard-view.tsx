"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { subDays } from "date-fns";
import { BarChart3, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "./filter-bar";
import { OverviewCards } from "./overview-cards";
import { Heatmap } from "./heatmap";
import { CriteriaChart } from "./criteria-chart";
import { TrendChart } from "./trend-chart";
import { AttentionList } from "./attention-list";
import { CallIntentChart } from "./call-intent-chart";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { generateMockDashboardData } from "@/lib/mock-dashboard-data";
// DashboardEmpty replaced by mock data — no longer needed
import type { DashboardData, DashboardFilters } from "@/lib/dashboard-types";

function filtersToParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("startDate", filters.startDate);
  params.set("endDate", filters.endDate);
  if (filters.technicianIds.length > 0) {
    params.set("technicianIds", filters.technicianIds.join(","));
  }
  if (filters.criteriaIds.length > 0) {
    params.set("criteriaIds", filters.criteriaIds.join(","));
  }
  if (!filters.excludeMock) {
    params.set("excludeMock", "false");
  }
  return params;
}

interface Props {
  orgId: string;
}

export function DashboardView({ orgId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL search params
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    const now = new Date();
    return {
      startDate:
        searchParams.get("startDate") || subDays(now, 30).toISOString(),
      endDate: searchParams.get("endDate") || now.toISOString(),
      technicianIds: searchParams.get("technicianIds")
        ? searchParams.get("technicianIds")!.split(",")
        : [],
      criteriaIds: searchParams.get("criteriaIds")
        ? searchParams.get("criteriaIds")!.split(",")
        : [],
      excludeMock: searchParams.get("excludeMock") !== "false",
    };
  });

  // Sync filters to URL search params
  const updateFilters = useCallback(
    (newFilters: DashboardFilters) => {
      setFilters(newFilters);
      router.replace(`?${filtersToParams(newFilters).toString()}`, {
        scroll: false,
      });
    },
    [router]
  );

  // Fetch dashboard data with AbortController for stale request cancellation
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dashboard/${orgId}?${filtersToParams(filters).toString()}`,
        { signal: controller.signal }
      );
      if (!response.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const json = await response.json();
      if (!json || !Array.isArray(json.criteriaPassRates)) {
        throw new Error("Invalid dashboard response");
      }
      setData(json);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [orgId, filters]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const handleFilterByCriteria = useCallback(
    (criteriaId: string) => {
      updateFilters({ ...filters, criteriaIds: [criteriaId] });
    },
    [filters, updateFilters]
  );

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={fetchData}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasEvalData = data.overview.totalEvaluations > 0;
  // Use mock data when no evaluations exist yet
  const displayData = hasEvalData ? data : generateMockDashboardData(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {!hasEvalData && (
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full self-start sm:self-auto">
            Sample data — run your first evaluation to see real results
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={updateFilters}
        technicians={displayData.availableTechnicians}
        criteria={displayData.availableCriteria}
      />

      {/* Call Intent Breakdown */}
      {displayData.callIntentBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Calls by Intent
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Number of calls per call intent
            </p>
          </CardHeader>
          <CardContent>
            <CallIntentChart data={displayData.callIntentBreakdown} />
          </CardContent>
        </Card>
      )}

      {/* Call Outcome Breakdown */}
      {displayData.callOutcomeBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Calls by Outcome
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Number of calls per call outcome
            </p>
          </CardHeader>
          <CardContent>
            <CallIntentChart data={displayData.callOutcomeBreakdown} color="#10b981" />
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <OverviewCards
        overview={displayData.overview}
        sparklineData={displayData.sparklineData}
        orgId={orgId}
        onFilterByCriteria={handleFilterByCriteria}
      />

      {/* Heatmap — only show if >1 technician */}
      {displayData.availableTechnicians.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Performance Heatmap
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Click any cell to see related transcripts
            </p>
          </CardHeader>
          <CardContent>
            <Heatmap data={displayData.heatmapData} orgId={orgId} />
          </CardContent>
        </Card>
      )}

      {/* Criteria Pass Rate Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Criteria Pass Rates
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Sorted by pass rate — weakest criteria at top
          </p>
        </CardHeader>
        <CardContent>
          <CriteriaChart
            data={displayData.criteriaPassRates}
            onCriteriaClick={handleFilterByCriteria}
          />
        </CardContent>
      </Card>

      {/* Trend Over Time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Trend Over Time
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Toggle technician lines below the chart
          </p>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={displayData.trendData}
            technicians={displayData.availableTechnicians}
          />
        </CardContent>
      </Card>

      {/* Needs Attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Needs Attention
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Recent transcripts with pass rates below 50%
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <AttentionList data={displayData.needsAttention} orgId={orgId} />
        </CardContent>
      </Card>

      {loading && data && (
        <div className="fixed bottom-20 right-4 md:bottom-4 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground shadow-md">
          Refreshing...
        </div>
      )}
    </div>
  );
}

export interface DashboardOverview {
  totalTranscripts: number;
  totalEvaluations: number;
  overallPassRate: number | null;
  passRateChange: number | null;
  totalCost: number | null;
  avgCostPerEval: number | null;
  mostImprovedTechnician: {
    id: string;
    name: string;
    improvement: number;
  } | null;
  weakestCriterion: {
    id: string;
    name: string;
    failRate: number | null;
  } | null;
}

export interface CriteriaPassRate {
  criteriaId: string;
  criteriaName: string;
  passRate: number | null;
  totalEvals: number;
  targetPassRate: number;
}

export interface HeatmapCell {
  technicianId: string;
  technicianName: string;
  criteriaId: string;
  criteriaName: string;
  passRate: number | null;
}

export interface TrendDataPoint {
  period: string;
  overallPassRate: number | null;
  technicianTrends: {
    technicianId: string;
    name: string;
    passRate: number | null;
  }[];
}

export interface NeedsAttentionItem {
  transcriptId: string;
  technicianName: string;
  date: string;
  serviceType: string | null;
  passRate: number | null;
  passed: number;
  total: number;
}

export interface SparklinePoint {
  date: string;
  passRate: number | null;
  evaluations: number;
}

export interface DashboardData {
  overview: DashboardOverview;
  criteriaPassRates: CriteriaPassRate[];
  heatmapData: HeatmapCell[];
  trendData: TrendDataPoint[];
  needsAttention: NeedsAttentionItem[];
  sparklineData: SparklinePoint[];
  availableTechnicians: { id: string; name: string }[];
  availableCriteria: { id: string; name: string }[];
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  technicianIds: string[];
  criteriaIds: string[];
  excludeMock: boolean;
}

import type { DashboardData } from "./dashboard-types";
import { ALL_INTENTS } from "./call-taxonomy";

const MOCK_TECHNICIANS = [
  { id: "mock-t1", name: "Mike Thompson" },
  { id: "mock-t2", name: "Sarah Davis" },
  { id: "mock-t3", name: "James Carter" },
];

const MOCK_CRITERIA = [
  { id: "mock-c1", name: "Proper Introduction" },
  { id: "mock-c2", name: "Needs Assessment" },
  { id: "mock-c3", name: "Trial Close" },
  { id: "mock-c4", name: "Active Listening" },
  { id: "mock-c5", name: "Empathy & Tone" },
];

const PASS_RATES = [0.55, 0.63, 0.71, 0.78, 0.84, 0.89, 0.92];
const EVAL_COUNTS = [11, 14, 16, 13, 18, 12, 15];

export function generateMockDashboardData(real: DashboardData): DashboardData {
  const technicians =
    real.availableTechnicians.length > 0
      ? real.availableTechnicians
      : MOCK_TECHNICIANS;

  const criteria =
    real.availableCriteria.length > 0
      ? real.availableCriteria
      : MOCK_CRITERIA;

  // 30-day sparkline
  const sparklineData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toISOString().split("T")[0],
      passRate: Math.min(0.95, 0.58 + i * 0.005 + Math.sin(i * 0.7) * 0.06),
      evaluations: Math.max(1, Math.round(2 + Math.sin(i * 0.5) * 1.5)),
    };
  });

  // Criteria pass rates — sorted weakest first (matches real chart)
  const criteriaPassRates = [...criteria]
    .map((c, i) => ({
      criteriaId: c.id,
      criteriaName: c.name,
      passRate: PASS_RATES[i % PASS_RATES.length],
      totalEvals: EVAL_COUNTS[i % EVAL_COUNTS.length],
      targetPassRate: 0.8,
    }))
    .sort((a, b) => (a.passRate ?? 1) - (b.passRate ?? 1));

  // Heatmap — tech × criteria grid
  const heatmapData = technicians.flatMap((tech, ti) =>
    criteria.map((c, ci) => ({
      technicianId: tech.id,
      technicianName: tech.name,
      criteriaId: c.id,
      criteriaName: c.name,
      passRate: Math.min(1, 0.5 + ti * 0.1 + ci * 0.07),
    }))
  );

  // Weekly trend — 8 periods
  const trendData = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i) * 7);
    return {
      period: d.toISOString().split("T")[0],
      overallPassRate: Math.min(0.92, 0.6 + i * 0.018),
      technicianTrends: technicians.map((tech, ti) => ({
        technicianId: tech.id,
        name: tech.name,
        passRate: Math.min(0.97, 0.52 + ti * 0.09 + i * 0.02),
      })),
    };
  });

  // Needs attention
  const needsAttention = [
    {
      transcriptId: "mock-tx1",
      technicianName: technicians[0]?.name ?? "Mike T.",
      date: new Date(Date.now() - 86_400_000).toISOString(),
      serviceType: "HVAC Repair",
      passRate: 0.4,
      passed: 2,
      total: 5,
    },
    {
      transcriptId: "mock-tx2",
      technicianName: technicians[1]?.name ?? "Sarah D.",
      date: new Date(Date.now() - 172_800_000).toISOString(),
      serviceType: "Plumbing",
      passRate: 0.33,
      passed: 1,
      total: 3,
    },
    {
      transcriptId: "mock-tx3",
      technicianName: technicians[0]?.name ?? "Mike T.",
      date: new Date(Date.now() - 259_200_000).toISOString(),
      serviceType: "Electrical",
      passRate: 0.44,
      passed: 4,
      total: 9,
    },
  ];

  // Call intent breakdown — top 8 intents with realistic counts
  const intentCounts = [14, 11, 9, 8, 7, 5, 4, 3];
  const callIntentBreakdown = ALL_INTENTS.slice(0, 8).map((label, i) => ({
    label,
    count: intentCounts[i],
  }));

  return {
    overview: {
      totalTranscripts: 47,
      totalEvaluations: 47,
      overallPassRate: 0.73,
      passRateChange: 0.05,
      totalCost: 2.34,
      avgCostPerEval: 0.05,
      mostImprovedTechnician:
        technicians.length > 0
          ? { id: technicians[0].id, name: technicians[0].name, improvement: 0.12 }
          : null,
      weakestCriterion:
        criteriaPassRates.length > 0
          ? {
              id: criteriaPassRates[0].criteriaId,
              name: criteriaPassRates[0].criteriaName,
              failRate: 1 - (criteriaPassRates[0].passRate ?? 0),
            }
          : null,
    },
    criteriaPassRates,
    heatmapData,
    trendData,
    needsAttention,
    sparklineData,
    availableTechnicians: technicians,
    availableCriteria: criteria,
    callIntentBreakdown,
  };
}

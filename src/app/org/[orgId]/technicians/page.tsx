import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { computeTechnicianStats } from "@/lib/technician-stats";
import { TechnicianManagement } from "@/components/technicians/technician-management";

export const metadata: Metadata = { title: "CSRs" };

export default async function TechniciansPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  const { data: technicians } = await supabase
    .from("technicians")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at");

  const techIds = (technicians || []).map((t) => t.id);
  const statsMap = await computeTechnicianStats(orgId, techIds);

  const techniciansWithStats = (technicians || []).map((tech) => ({
    ...tech,
    stats: statsMap.get(tech.id) || { totalCalls: 0, passRate: null },
  }));

  return <TechnicianManagement orgId={orgId} initialTechnicians={techniciansWithStats} />;
}

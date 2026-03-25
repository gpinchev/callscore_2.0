import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { CriteriaManager } from "@/components/criteria/criteria-manager";

export const metadata: Metadata = { title: "Eval Criteria" };

export default async function CriteriaPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  let criteria: Parameters<typeof CriteriaManager>[0]["initialCriteria"] = [];

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("eval_criteria")
      .select("*, few_shot_examples(*)")
      .eq("organization_id", orgId)
      .order("sort_order");
    criteria = data || [];
  } catch {
    // Supabase unavailable — CriteriaManager will show mock criteria
  }

  return <CriteriaManager orgId={orgId} initialCriteria={criteria} />;
}

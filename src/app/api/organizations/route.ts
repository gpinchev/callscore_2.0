import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  company_size: z.string().max(50).nullable().optional(),
  notification_email: z.string().email().nullable().optional(),
  onboarding_completed: z.boolean().default(false),
});

export async function GET() {
  const supabase = createServerClient();

  const [orgResult, costResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("transcripts")
      .select("organization_id, eval_cost_usd"),
  ]);

  if (orgResult.error) {
    console.error("organizations GET error:", orgResult.error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }

  // Aggregate cost per org
  const costByOrg = new Map<string, number>();
  for (const t of costResult.data || []) {
    const cost = t.eval_cost_usd;
    if (typeof cost === "number" && cost > 0) {
      costByOrg.set(
        t.organization_id,
        (costByOrg.get(t.organization_id) || 0) + cost
      );
    }
  }

  const orgsWithCost = orgResult.data.map((org) => ({
    ...org,
    total_eval_cost: costByOrg.get(org.id) || null,
  }));

  return NextResponse.json(orgsWithCost);
}

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    console.error("organizations POST error:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

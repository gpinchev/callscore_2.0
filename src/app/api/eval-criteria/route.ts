import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createCriterionSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.string().max(100).nullable().optional(),
  call_intent: z.string().max(100).nullable().optional(),
  call_intents: z.array(z.string().max(100)).max(50).optional(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  notify_on_fail: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("published"),
});

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const orgId = request.nextUrl.searchParams.get("organization_id");

  if (!orgId) {
    return NextResponse.json(
      { error: "organization_id query parameter is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("eval_criteria")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order");

  if (error) {
    console.error("eval-criteria GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch eval criteria" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCriterionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("eval_criteria")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    console.error("eval-criteria POST error:", error);
    return NextResponse.json(
      { error: "Failed to create eval criterion" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateCriterionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z.string().max(100).nullable().optional(),
  call_intent: z.string().max(100).nullable().optional(),
  call_intents: z.array(z.string().max(100)).max(50).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  status: z.enum(["draft", "published"]).optional(),
  target_pass_rate: z.number().min(0).max(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("eval_criteria")
    .select("*, few_shot_examples(*)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("eval-criteria/[id] GET error:", error);
    return NextResponse.json(
      { error: "Eval criterion not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateCriterionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("eval_criteria")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("eval-criteria/[id] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update eval criterion" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("eval_criteria")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("eval-criteria/[id] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete eval criterion" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

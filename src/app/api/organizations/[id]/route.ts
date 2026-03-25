import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const taxonomyEntrySchema = z.object({
  callType: z.string().min(1).max(100),
  intents: z.array(z.string().min(1).max(100)).max(50),
  outcomes: z.array(z.string().min(1).max(100)).max(50),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  industry: z.string().min(1).max(100).optional(),
  company_size: z.string().max(50).nullable().optional(),
  notification_email: z.array(z.string().email()).max(10).nullable().optional(),
  onboarding_completed: z.boolean().optional(),
  call_taxonomy: z.array(taxonomyEntrySchema).max(20).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("organizations/[id] GET error:", error);
    return NextResponse.json(
      { error: "Organization not found" },
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

  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("organizations/[id] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

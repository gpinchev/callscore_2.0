import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { callOpenRouter } from "@/lib/openrouter";
import {
  buildMockCallSystemPrompt,
  buildMockCallUserPrompt,
} from "@/lib/prompts/mock-call";
import { z } from "zod";

const mockCallSchema = z.object({
  technicianId: z.string().uuid(),
  organizationId: z.string().uuid(),
  scenario: z.string().min(10).max(1000),
});

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = mockCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { technicianId, organizationId, scenario } = parsed.data;

  // 1. Fetch technician
  const { data: technician, error: techError } = await supabase
    .from("technicians")
    .select("name")
    .eq("id", technicianId)
    .single();

  if (techError || !technician) {
    console.error("Mock call: technician fetch error:", techError);
    return NextResponse.json(
      { error: "Technician not found" },
      { status: 404 }
    );
  }

  // 2. Fetch org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name, industry")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    console.error("Mock call: org fetch error:", orgError);
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // 3. Fetch active published eval criteria
  const { data: criteria } = await supabase
    .from("eval_criteria")
    .select("name, description")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("status", "published")
    .order("sort_order");

  // 4. Build prompt and generate mock transcript
  const systemPrompt = buildMockCallSystemPrompt(org.industry);
  const userPrompt = buildMockCallUserPrompt({
    technicianName: technician.name,
    orgIndustry: org.industry,
    scenario,
    criteria: criteria || [],
  });

  let rawTranscript: string;
  let genCostUsd: number | null = null;
  let genPromptTokens: number | null = null;
  let genCompletionTokens: number | null = null;
  try {
    const { content, usage } = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 4096, timeout: 60000 }
    );
    rawTranscript = content;
    if (usage) {
      genCostUsd = usage.costUsd;
      genPromptTokens = usage.promptTokens;
      genCompletionTokens = usage.completionTokens;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Mock call generation failed";
    console.error("Mock call LLM error:", errMsg, err);
    return NextResponse.json(
      { error: "Failed to generate mock call — please try again" },
      { status: 502 }
    );
  }

  // 5. Store as transcript with source 'mock'
  const serviceType = extractServiceType(scenario) || "Practice Call";
  const { data: transcript, error: insertError } = await supabase
    .from("transcripts")
    .insert({
      organization_id: organizationId,
      technician_id: technicianId,
      source: "mock",
      raw_transcript: rawTranscript,
      service_type: serviceType,
      eval_status: "pending",
      eval_cost_usd: genCostUsd,
      eval_prompt_tokens: genPromptTokens,
      eval_completion_tokens: genCompletionTokens,
    })
    .select()
    .single();

  if (insertError || !transcript) {
    console.error("Mock call: transcript insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to store mock call transcript" },
      { status: 500 }
    );
  }

  // 6. Trigger eval pipeline (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const evalResponse = await fetch(`${appUrl}/api/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId: transcript.id }),
      });

      if (!evalResponse.ok) {
        console.error("Mock call: eval trigger failed:", evalResponse.status);
      }
    } catch (err) {
      console.error("Mock call: eval trigger error:", err);
    }
  } else {
    console.warn("NEXT_PUBLIC_APP_URL not set — skipping eval trigger from mock-call");
  }

  return NextResponse.json({
    transcriptId: transcript.id,
    transcript: rawTranscript,
  }, { status: 201 });
}

function extractServiceType(scenario: string): string | null {
  const lower = scenario.toLowerCase();
  if (lower.includes("repair")) return "Repair";
  if (lower.includes("installation") || lower.includes("install")) return "Installation";
  if (lower.includes("maintenance")) return "Maintenance";
  if (lower.includes("inspection")) return "Inspection";
  if (lower.includes("consultation") || lower.includes("consult")) return "Consultation";
  if (lower.includes("emergency")) return "Emergency";
  if (lower.includes("estimate") || lower.includes("quote")) return "Estimate";
  if (lower.includes("follow-up") || lower.includes("followup")) return "Follow-up";
  return null;
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { callOpenRouter, parseJsonResponse } from "@/lib/openrouter";
import { buildTestPrompt } from "@/lib/prompts/eval";
import { z } from "zod";

const testSchema = z.object({
  criterionId: z.string().uuid(),
  transcriptSnippet: z.string().min(1).max(50000),
});

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { criterionId, transcriptSnippet } = parsed.data;

  // Fetch criterion with its few-shot examples
  const { data: criterion, error: criterionError } = await supabase
    .from("eval_criteria")
    .select("*, few_shot_examples(*)")
    .eq("id", criterionId)
    .single();

  if (criterionError || !criterion) {
    return NextResponse.json(
      { error: "Eval criterion not found" },
      { status: 404 }
    );
  }

  // Build prompts
  const { system, user } = buildTestPrompt(
    { name: criterion.name, description: criterion.description, id: criterion.id },
    transcriptSnippet,
    criterion.few_shot_examples || []
  );

  // Call OpenRouter
  try {
    const { content: rawResponse, usage } = await callOpenRouter([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const result = parseJsonResponse<{
      criteria_id: string;
      criteria_name: string;
      passed: boolean;
      confidence: number;
      reasoning: string;
      excerpt: string;
    }>(rawResponse);

    return NextResponse.json({
      ...result,
      costUsd: usage?.costUsd ?? null,
    });
  } catch (err) {
    console.error("Eval test error:", err);
    return NextResponse.json(
      { error: "AI evaluation failed" },
      { status: 502 }
    );
  }
}

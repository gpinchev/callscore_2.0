import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { callOpenRouter, parseJsonResponse } from "@/lib/openrouter";
import {
  buildEvalSystemPrompt,
  buildEvalUserPrompt,
  type EvalResponse,
} from "@/lib/prompts/eval";
import { sendEvalEmailAsync } from "@/lib/send-eval-email";
import { z } from "zod";

const evaluateSchema = z.object({
  transcriptId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = evaluateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { transcriptId } = parsed.data;

  // 1. Fetch transcript
  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .select("*, organizations(name, industry)")
    .eq("id", transcriptId)
    .single();

  if (transcriptError || !transcript) {
    console.error("Eval: transcript fetch error:", transcriptError);
    return NextResponse.json(
      { error: "Transcript not found" },
      { status: 404 }
    );
  }

  const org = transcript.organizations as { name: string; industry: string } | null;
  if (!org) {
    console.error("Eval: no org found on transcript", transcript.organization_id);
    return NextResponse.json(
      { error: "Organization not found for transcript" },
      { status: 404 }
    );
  }

  // 2. Atomically update eval_status to 'processing' (only if still pending/failed)
  const { data: updated } = await supabase
    .from("transcripts")
    .update({ eval_status: "processing" })
    .eq("id", transcriptId)
    .in("eval_status", ["pending", "failed"])
    .select("id")
    .single();

  if (!updated) {
    return NextResponse.json(
      { error: "Transcript is already being evaluated" },
      { status: 409 }
    );
  }

  // 3. Fetch active published criteria with few-shot examples
  const { data: criteria, error: criteriaError } = await supabase
    .from("eval_criteria")
    .select("*, few_shot_examples(*)")
    .eq("organization_id", transcript.organization_id)
    .eq("is_active", true)
    .eq("status", "published")
    .order("sort_order");

  if (criteriaError || !criteria || criteria.length === 0) {
    await supabase
      .from("transcripts")
      .update({
        eval_status: "failed",
        metadata: { error: "No active published eval criteria found" },
      })
      .eq("id", transcriptId);

    return NextResponse.json(
      { error: "No active published eval criteria found for this organization" },
      { status: 422 }
    );
  }

  // 4. Build prompts and call OpenRouter
  const systemPrompt = buildEvalSystemPrompt(org.name, org.industry);
  const userPrompt = buildEvalUserPrompt({
    orgName: org.name,
    orgIndustry: org.industry,
    rawTranscript: transcript.raw_transcript,
    criteria,
  });

  let evalResponse: EvalResponse;
  let evalCostUsd: number | null = null;
  let evalPromptTokens: number | null = null;
  let evalCompletionTokens: number | null = null;
  try {
    const { content: rawResponse, usage } = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    if (usage) {
      evalCostUsd = usage.costUsd;
      evalPromptTokens = usage.promptTokens;
      evalCompletionTokens = usage.completionTokens;
    }

    evalResponse = parseJsonResponse<EvalResponse>(rawResponse);

    if (!evalResponse.results || !Array.isArray(evalResponse.results)) {
      throw new Error("Invalid response structure: missing results array");
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "LLM evaluation failed";
    console.error("Eval pipeline LLM error:", errMsg, err);
    await supabase
      .from("transcripts")
      .update({
        eval_status: "failed",
        metadata: { error: errMsg },
      })
      .eq("id", transcriptId);

    return NextResponse.json(
      { error: "AI evaluation failed — please try again" },
      { status: 502 }
    );
  }

  // 5. Generate eval_run_id and store results
  const evalRunId = crypto.randomUUID();

  const evalResults = evalResponse.results.map((r) => ({
    transcript_id: transcriptId,
    eval_criteria_id: r.criteria_id,
    passed: r.passed,
    confidence: r.confidence,
    reasoning: r.reasoning,
    transcript_excerpt: r.excerpt,
    excerpt_start_index: r.excerpt_start ?? null,
    excerpt_end_index: r.excerpt_end ?? null,
    eval_run_id: evalRunId,
  }));

  const { error: insertError } = await supabase
    .from("eval_results")
    .insert(evalResults);

  if (insertError) {
    console.error("Eval results insert error:", insertError);
    await supabase
      .from("transcripts")
      .update({ eval_status: "failed" })
      .eq("id", transcriptId);

    return NextResponse.json(
      { error: "Failed to store evaluation results" },
      { status: 500 }
    );
  }

  // 6. Update transcript with summary, completed status, and cost data
  const { error: updateError } = await supabase
    .from("transcripts")
    .update({
      summary: evalResponse.summary || null,
      eval_status: "completed",
      eval_cost_usd: evalCostUsd,
      eval_prompt_tokens: evalPromptTokens,
      eval_completion_tokens: evalCompletionTokens,
    })
    .eq("id", transcriptId);

  if (updateError) {
    console.error("Transcript update error:", updateError);
  }

  // 7. Fire-and-forget email notification
  // Send if: non-mock transcript AND at least one "notify_on_fail" criterion failed
  if (transcript.source !== "mock") {
    const failedCriteriaIds = new Set(
      evalResponse.results.filter((r) => !r.passed).map((r) => r.criteria_id)
    );
    const hasNotifyFailure = criteria.some(
      (c) => (c as Record<string, unknown>).notify_on_fail === true && failedCriteriaIds.has(c.id)
    );
    if (hasNotifyFailure) {
      sendEvalEmailAsync(transcriptId).catch(() => {});
    }
  }

  // 8. Return results
  const passedCount = evalResponse.results.filter((r) => r.passed).length;

  return NextResponse.json({
    transcriptId,
    evalRunId,
    summary: evalResponse.summary,
    passedCount,
    totalCount: evalResponse.results.length,
    results: evalResponse.results,
    costUsd: evalCostUsd,
  });
}

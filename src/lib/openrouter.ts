interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

interface OpenRouterUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface OpenRouterResult {
  content: string;
  usage: OpenRouterUsage | null;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

// OpenRouter pricing for Claude Sonnet 4 (per token)
const PRICING: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-4": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
};

function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = PRICING[model] || PRICING[DEFAULT_MODEL];
  return promptTokens * pricing.input + completionTokens * pricing.output;
}

export async function callOpenRouter(
  messages: ChatMessage[],
  options: OpenRouterOptions = {}
): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeout ?? 45000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://callscore.vercel.app",
        "X-Title": "CallScore",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      throw new Error(
        response.status === 401
          ? "API authentication failed"
          : response.status === 429
          ? "Rate limit exceeded — try again shortly"
          : "External AI service error"
      );
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenRouter");
    }

    let usage: OpenRouterUsage | null = null;
    if (data.usage) {
      const promptTokens = data.usage.prompt_tokens;
      const completionTokens = data.usage.completion_tokens;
      usage = {
        promptTokens,
        completionTokens,
        totalTokens: data.usage.total_tokens,
        costUsd: calculateCost(model, promptTokens, completionTokens),
      };
    }

    return { content, usage };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI evaluation timed out — the transcript may be too long");
    }
    throw err;
  }
}

/**
 * Parse JSON from LLM response, stripping markdown code fences if present.
 */
export function parseJsonResponse<T>(raw: string): T {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned);
}

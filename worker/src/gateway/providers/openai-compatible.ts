import type { ZodType } from "zod";
import type {
  AIProvider,
  GenerationRequest,
  GenerationResult,
} from "../types.js";
import { buildPrompt } from "../prompt.js";
import { generatedContentSchema } from "../schemas.js";

export interface OpenAICompatibleConfig {
  id: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface CompletionResult<T> {
  parsed: T;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Groq, Mistral and OpenRouter all expose an OpenAI-compatible /chat/completions endpoint — one
 * HTTP call covers any of them, for any JSON-shaped task (content generation, creative-director
 * specs, ...), validated against whatever zod schema the caller passes in.
 */
export async function completeJSON<T>(
  config: OpenAICompatibleConfig,
  prompt: { system: string; user: string },
  schema: ZodType<T>,
): Promise<CompletionResult<T>> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `${config.id} request failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const raw = data.choices[0]?.message.content;
  if (!raw) {
    throw new Error(`${config.id} returned no content`);
  }

  return {
    parsed: schema.parse(JSON.parse(raw)),
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}

/**
 * Groq, Mistral and OpenRouter all expose an OpenAI-compatible /chat/completions endpoint —
 * one implementation covers all three, configured per provider (see providers/groq.ts etc).
 */
export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
): AIProvider {
  return {
    id: config.id,
    async generate(req: GenerationRequest): Promise<GenerationResult> {
      const { parsed, tokensIn, tokensOut } = await completeJSON(
        config,
        buildPrompt(req),
        generatedContentSchema,
      );

      return {
        text: parsed.caption,
        structured: parsed,
        provider: config.id,
        model: config.model,
        tokensIn,
        tokensOut,
      };
    },
  };
}

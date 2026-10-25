import type { ZodType } from "zod";
import type { AIProvider } from "../types.js";
import { completeJSON } from "./openai-compatible.js";
import { GROQ_BASE_URL, GROQ_MODEL } from "./groq.js";
import { MISTRAL_BASE_URL, MISTRAL_MODEL } from "./mistral.js";
import { OPENROUTER_BASE_URL, OPENROUTER_MODEL } from "./openrouter.js";

export interface ProviderKeys {
  GROQ_API_KEY: string;
  MISTRAL_API_KEY: string;
  OPENROUTER_API_KEY: string;
}

export interface JSONCompletion<T> {
  parsed: T;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

/**
 * The same Groq -> Mistral -> OpenRouter fallback chain the text-content gateway already uses
 * (see providers/groq.ts etc), generalized to any JSON-shaped prompt + output schema — reused by
 * the Creative Director spec and the AI revision translator instead of re-implementing the HTTP
 * fallback per feature.
 */
export function createJSONProviders<TReq, TParsed>(
  env: ProviderKeys,
  buildPrompt: (req: TReq) => { system: string; user: string },
  schema: ZodType<TParsed>,
): AIProvider<TReq, JSONCompletion<TParsed>>[] {
  const configs = [
    { id: "groq", baseUrl: GROQ_BASE_URL, model: GROQ_MODEL, apiKey: env.GROQ_API_KEY },
    { id: "mistral", baseUrl: MISTRAL_BASE_URL, model: MISTRAL_MODEL, apiKey: env.MISTRAL_API_KEY },
    {
      id: "openrouter",
      baseUrl: OPENROUTER_BASE_URL,
      model: OPENROUTER_MODEL,
      apiKey: env.OPENROUTER_API_KEY,
    },
  ];

  return configs.map((config) => ({
    id: config.id,
    async generate(req: TReq): Promise<JSONCompletion<TParsed>> {
      const { parsed, tokensIn, tokensOut } = await completeJSON(
        config,
        buildPrompt(req),
        schema,
      );
      return { parsed, provider: config.id, model: config.model, tokensIn, tokensOut };
    },
  }));
}

import type { AIProvider } from "../types.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

export const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";
// Verified live against GET {BASE_URL}/models on 2026-10-25. Confirm the account has opted out
// of training on free-mode data (see docs/01-architecture-plan.md §5 / the free-llm-api-advisor
// skill) — a per-account setting this file can't verify.
export const MISTRAL_MODEL = "mistral-small-latest";

export function createMistralProvider(apiKey: string): AIProvider {
  return createOpenAICompatibleProvider({
    id: "mistral",
    baseUrl: MISTRAL_BASE_URL,
    model: MISTRAL_MODEL,
    apiKey,
  });
}

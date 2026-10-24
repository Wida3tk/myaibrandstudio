import type { AIProvider } from "../types.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

const BASE_URL = "https://openrouter.ai/api/v1";
// Verified live against GET {BASE_URL}/models on 2026-10-25 (the original placeholder,
// meta-llama/llama-3.1-8b-instruct:free, had been retired from the free pool and returned 404).
// OpenRouter's free pool is a set of specific model ids (suffixed ":free") that rotates —
// re-check before relying on this if it's been a while.
const MODEL = "google/gemma-4-31b-it:free";

export function createOpenRouterProvider(apiKey: string): AIProvider {
  return createOpenAICompatibleProvider({
    id: "openrouter",
    baseUrl: BASE_URL,
    model: MODEL,
    apiKey,
  });
}

import type { AIProvider } from "../types.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

const BASE_URL = "https://openrouter.ai/api/v1";
// OpenRouter's free pool is a set of specific model ids (suffixed ":free"), not one fixed name —
// list current ones via GET {BASE_URL}/models before first deploy and pick one here. This is a
// placeholder, not a verified-working id.
const MODEL = "meta-llama/llama-3.1-8b-instruct:free";

export function createOpenRouterProvider(apiKey: string): AIProvider {
  return createOpenAICompatibleProvider({
    id: "openrouter",
    baseUrl: BASE_URL,
    model: MODEL,
    apiKey,
  });
}

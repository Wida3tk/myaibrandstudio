import type { AIProvider } from "../types.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

const BASE_URL = "https://api.mistral.ai/v1";
// Verify the current model list before first deploy, and confirm the account has opted out of
// training on free-mode data (see docs/01-architecture-plan.md §5 / the free-llm-api-advisor skill).
const MODEL = "mistral-small-latest";

export function createMistralProvider(apiKey: string): AIProvider {
  return createOpenAICompatibleProvider({
    id: "mistral",
    baseUrl: BASE_URL,
    model: MODEL,
    apiKey,
  });
}

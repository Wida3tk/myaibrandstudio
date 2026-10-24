import type { AIProvider } from "../types.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

const BASE_URL = "https://api.groq.com/openai/v1";
// Verify the current model list (GET {BASE_URL}/models) before first deploy — Groq's lineup
// changes. This is a reasonable default as of the free-llm-api-advisor snapshot, not a promise.
const MODEL = "llama-3.3-70b-versatile";

export function createGroqProvider(apiKey: string): AIProvider {
  return createOpenAICompatibleProvider({
    id: "groq",
    baseUrl: BASE_URL,
    model: MODEL,
    apiKey,
  });
}

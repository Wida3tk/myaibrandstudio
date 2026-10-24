import type { AIProvider } from "../types.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

const BASE_URL = "https://api.groq.com/openai/v1";
// Verified live against GET {BASE_URL}/models on 2026-10-25 (the original placeholder,
// llama-3.3-70b-versatile, had been retired and returned 404s). Groq's lineup changes —
// re-check before relying on this if it's been a while.
const MODEL = "openai/gpt-oss-120b";

export function createGroqProvider(apiKey: string): AIProvider {
  return createOpenAICompatibleProvider({
    id: "groq",
    baseUrl: BASE_URL,
    model: MODEL,
    apiKey,
  });
}

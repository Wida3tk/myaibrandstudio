import type { AIProvider } from "../types.js";
import {
  completeJSON,
  type OpenAICompatibleConfig,
} from "../providers/openai-compatible.js";
import { GROQ_BASE_URL, GROQ_MODEL } from "../providers/groq.js";
import { MISTRAL_BASE_URL, MISTRAL_MODEL } from "../providers/mistral.js";
import {
  OPENROUTER_BASE_URL,
  OPENROUTER_MODEL,
} from "../providers/openrouter.js";
import { buildCreativePrompt } from "./prompt.js";
import { creativeSpecSchema } from "./schema.js";
import type { CreativeBriefRequest, CreativeGenerationResult } from "./types.js";

/**
 * Same OpenAI-compatible providers the text-content gateway already falls back across (Groq ->
 * Mistral -> OpenRouter), reused here for the Creative Director's structured spec — only the
 * prompt and output schema differ.
 */
function createCreativeDirectorProvider(
  config: OpenAICompatibleConfig,
): AIProvider<CreativeBriefRequest, CreativeGenerationResult> {
  return {
    id: config.id,
    async generate(req) {
      const { parsed, tokensIn, tokensOut } = await completeJSON(
        config,
        buildCreativePrompt(req),
        creativeSpecSchema,
      );
      return {
        // The request already knows the exact pixel size — never trust the model's own echo of it.
        spec: { ...parsed, platformDimensions: { width: req.width, height: req.height } },
        provider: config.id,
        model: config.model,
        tokensIn,
        tokensOut,
      };
    },
  };
}

export function createCreativeDirectorProviders(env: {
  GROQ_API_KEY: string;
  MISTRAL_API_KEY: string;
  OPENROUTER_API_KEY: string;
}): AIProvider<CreativeBriefRequest, CreativeGenerationResult>[] {
  return [
    createCreativeDirectorProvider({
      id: "groq",
      baseUrl: GROQ_BASE_URL,
      model: GROQ_MODEL,
      apiKey: env.GROQ_API_KEY,
    }),
    createCreativeDirectorProvider({
      id: "mistral",
      baseUrl: MISTRAL_BASE_URL,
      model: MISTRAL_MODEL,
      apiKey: env.MISTRAL_API_KEY,
    }),
    createCreativeDirectorProvider({
      id: "openrouter",
      baseUrl: OPENROUTER_BASE_URL,
      model: OPENROUTER_MODEL,
      apiKey: env.OPENROUTER_API_KEY,
    }),
  ];
}

import type { AIProvider } from "../types.js";
import { createJSONProviders, type ProviderKeys } from "../providers/json-fallback.js";
import { buildCreativePrompt } from "./prompt.js";
import { creativeSpecSchema } from "./schema.js";
import type { CreativeBriefRequest, CreativeGenerationResult } from "./types.js";

export function createCreativeDirectorProviders(
  env: ProviderKeys,
): AIProvider<CreativeBriefRequest, CreativeGenerationResult>[] {
  return createJSONProviders(env, buildCreativePrompt, creativeSpecSchema).map(
    (provider) => ({
      id: provider.id,
      async generate(req) {
        const { parsed, provider: usedProvider, model, tokensIn, tokensOut } =
          await provider.generate(req);
        return {
          // The request already knows the exact pixel size — never trust the model's own echo.
          spec: { ...parsed, platformDimensions: { width: req.width, height: req.height } },
          provider: usedProvider,
          model,
          tokensIn,
          tokensOut,
        };
      },
    }),
  );
}

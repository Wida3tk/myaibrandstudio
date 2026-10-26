import type { AIProvider } from "../types.js";
import {
  createJSONProviders,
  type ProviderKeys,
} from "../providers/json-fallback.js";
import { buildVideoScriptPrompt } from "./prompt.js";
import { videoScriptSchema } from "./schema.js";
import type { VideoScriptBriefRequest, VideoScriptResult } from "./types.js";

export function createVideoScriptProviders(
  env: ProviderKeys,
): AIProvider<VideoScriptBriefRequest, VideoScriptResult>[] {
  return createJSONProviders(
    env,
    buildVideoScriptPrompt,
    videoScriptSchema,
  ).map((provider) => ({
    id: provider.id,
    async generate(req) {
      const {
        parsed,
        provider: usedProvider,
        model,
        tokensIn,
        tokensOut,
      } = await provider.generate(req);
      return {
        script: parsed,
        provider: usedProvider,
        model,
        tokensIn,
        tokensOut,
      };
    },
  }));
}

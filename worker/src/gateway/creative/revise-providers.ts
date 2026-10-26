import type { AIProvider } from "../types.js";
import {
  createJSONProviders,
  type ProviderKeys,
} from "../providers/json-fallback.js";
import { buildRevisionPrompt } from "./revise-prompt.js";
import {
  reviseResponseSchema,
  type ReviseRequestInput,
} from "./revise-schema.js";

export interface ReviseResult {
  ops: ReturnType<typeof reviseResponseSchema.parse>["ops"];
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

export function createRevisionProviders(
  env: ProviderKeys,
): AIProvider<ReviseRequestInput, ReviseResult>[] {
  return createJSONProviders(
    env,
    buildRevisionPrompt,
    reviseResponseSchema,
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
        ops: parsed.ops,
        provider: usedProvider,
        model,
        tokensIn,
        tokensOut,
      };
    },
  }));
}

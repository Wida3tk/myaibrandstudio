import type {
  AIProvider,
  GenerationRequest,
  GenerationResult,
} from "./types.js";

export interface ProviderAttempt {
  provider: string;
  error: unknown;
}

export class AllProvidersFailedError extends Error {
  constructor(public readonly attempts: ProviderAttempt[]) {
    super(
      `All providers failed: ${attempts
        .map((a) => `${a.provider} (${String(a.error)})`)
        .join("; ")}`,
    );
    this.name = "AllProvidersFailedError";
  }
}

/**
 * Tries each provider in order, falling back to the next on any error (network failure, non-2xx
 * response, or a structured-output response that fails schema validation). Throws only once every
 * provider in the chain has failed.
 */
export async function generateWithFallback(
  req: GenerationRequest,
  providers: AIProvider[],
): Promise<GenerationResult> {
  const attempts: ProviderAttempt[] = [];

  for (const provider of providers) {
    try {
      return await provider.generate(req);
    } catch (error) {
      attempts.push({ provider: provider.id, error });
    }
  }

  throw new AllProvidersFailedError(attempts);
}

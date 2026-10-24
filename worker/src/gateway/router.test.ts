import { describe, expect, it, vi } from "vitest";
import { generateWithFallback, AllProvidersFailedError } from "./router.js";
import type {
  AIProvider,
  GenerationRequest,
  GenerationResult,
} from "./types.js";

const req: GenerationRequest = {
  orgId: "org1",
  brandId: "brand1",
  contentType: "post",
  language: "en",
  brandVoice: "friendly",
  brandAudience: "everyone",
  brandMemoryFacts: [],
  topic: "launch",
};

const okResult: GenerationResult = {
  text: "hello",
  structured: { hook: "h", caption: "hello", hashtags: [], callToAction: "" },
  provider: "fake",
  model: "fake-model",
  tokensIn: 1,
  tokensOut: 1,
};

function fakeProvider(
  id: string,
  impl: () => Promise<GenerationResult>,
): AIProvider {
  return { id, generate: vi.fn(impl) };
}

describe("generateWithFallback", () => {
  it("returns the first provider's result when it succeeds", async () => {
    const first = fakeProvider("first", () => Promise.resolve(okResult));
    const second = fakeProvider("second", () => Promise.resolve(okResult));

    const result = await generateWithFallback(req, [first, second]);

    expect(result.provider).toBe("fake");
    expect(first.generate).toHaveBeenCalledTimes(1);
    expect(second.generate).not.toHaveBeenCalled();
  });

  it("falls back to the next provider when the first fails", async () => {
    const first = fakeProvider("first", () =>
      Promise.reject(new Error("boom")),
    );
    const second = fakeProvider("second", () => Promise.resolve(okResult));

    const result = await generateWithFallback(req, [first, second]);

    expect(result.provider).toBe("fake");
    expect(first.generate).toHaveBeenCalledTimes(1);
    expect(second.generate).toHaveBeenCalledTimes(1);
  });

  it("throws AllProvidersFailedError listing every attempt when all fail", async () => {
    const first = fakeProvider("first", () => Promise.reject(new Error("a")));
    const second = fakeProvider("second", () => Promise.reject(new Error("b")));

    await expect(generateWithFallback(req, [first, second])).rejects.toSatisfy(
      (err: unknown) => {
        expect(err).toBeInstanceOf(AllProvidersFailedError);
        const failure = err as AllProvidersFailedError;
        expect(failure.attempts.map((a) => a.provider)).toEqual([
          "first",
          "second",
        ]);
        return true;
      },
    );
  });
});

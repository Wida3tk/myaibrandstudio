import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerationError, generateContent } from "./generate";

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({
    currentUser: { getIdToken: () => Promise.resolve("token") },
  }),
}));

const baseInput = {
  orgId: "org1",
  brandId: "brand1",
  contentType: "post" as const,
  language: "en" as const,
  topic: "launch",
};

describe("generateContent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps a resource-exhausted response to a GenerationError with a friendly message", async () => {
    vi.stubEnv("NEXT_PUBLIC_AI_GATEWAY_URL", "https://gateway.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "resource-exhausted" }), {
          status: 429,
        }),
      ),
    );

    await expect(generateContent(baseInput)).rejects.toMatchObject({
      name: "GenerationError",
      code: "resource-exhausted",
    });
  });

  it("falls back to 'unknown' for an unrecognized error code", async () => {
    vi.stubEnv("NEXT_PUBLIC_AI_GATEWAY_URL", "https://gateway.example.com");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("", { status: 500 })),
    );

    const error = await generateContent(baseInput).catch((e) => e);
    expect(error).toBeInstanceOf(GenerationError);
    expect(error.code).toBe("unknown");
  });

  it("sends optional tone/audience/pillars/instructions overrides in the request body", async () => {
    vi.stubEnv("NEXT_PUBLIC_AI_GATEWAY_URL", "https://gateway.example.com");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ structured: { hook: "h", caption: "c", hashtags: [], callToAction: "" }, provider: "groq" }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateContent({
      ...baseInput,
      toneOverride: "bold",
      audienceOverride: "gamers",
      pillars: ["education"],
      customInstructions: "end with a question",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.toneOverride).toBe("bold");
    expect(sentBody.audienceOverride).toBe("gamers");
    expect(sentBody.pillars).toEqual(["education"]);
    expect(sentBody.customInstructions).toBe("end with a question");
  });
});

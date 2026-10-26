import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateVoiceover,
  VoiceoverProviderUnavailableError,
} from "./voiceover.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const unconfigured = { GROQ_API_KEY: "", CF_ACCOUNT_ID: "", CF_API_TOKEN: "" };

describe("generateVoiceover", () => {
  it("throws VoiceoverProviderUnavailableError when nothing is configured", async () => {
    await expect(
      generateVoiceover(unconfigured, "hello", "en"),
    ).rejects.toBeInstanceOf(VoiceoverProviderUnavailableError);
  });

  it("returns Groq audio on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
        ),
    );

    const result = await generateVoiceover(
      { ...unconfigured, GROQ_API_KEY: "key1" },
      "hello",
      "en",
    );
    expect(result.provider).toBe("groq");
    expect(result.mimeType).toBe("audio/wav");
    expect(typeof result.base64).toBe("string");
  });

  it("falls back to Cloudflare melotts (English only) when Groq fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com"))
        return new Response("down", { status: 500 });
      return new Response(
        JSON.stringify({ success: true, result: { audio: "b64" } }),
        {
          status: 200,
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateVoiceover(
      { GROQ_API_KEY: "key1", CF_ACCOUNT_ID: "acc1", CF_API_TOKEN: "tok1" },
      "hello",
      "en",
    );
    expect(result.provider).toBe("cloudflare-workers-ai");
  });

  it("does not fall back to Cloudflare melotts for Arabic (English-only fallback)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 500 })),
    );

    await expect(
      generateVoiceover(
        { GROQ_API_KEY: "key1", CF_ACCOUNT_ID: "acc1", CF_API_TOKEN: "tok1" },
        "مرحبا",
        "ar",
      ),
    ).rejects.toBeInstanceOf(VoiceoverProviderUnavailableError);
  });
});

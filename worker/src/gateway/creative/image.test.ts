import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateBackgroundImage,
  ImageProviderUnavailableError,
} from "./image.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateBackgroundImage", () => {
  it("throws ImageProviderUnavailableError when not configured", async () => {
    await expect(
      generateBackgroundImage({ CF_ACCOUNT_ID: "", CF_API_TOKEN: "" }, "a cat"),
    ).rejects.toBeInstanceOf(ImageProviderUnavailableError);
  });

  it("returns the decoded image on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: true, result: { image: "base64data" } }),
            { status: 200 },
          ),
        ),
    );

    const result = await generateBackgroundImage(
      { CF_ACCOUNT_ID: "acc1", CF_API_TOKEN: "tok1" },
      "a cat",
    );
    expect(result).toEqual({
      base64: "base64data",
      mimeType: "image/jpeg",
      provider: "cloudflare-workers-ai",
    });
  });

  it("throws when the API reports failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ message: "bad prompt" }],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      generateBackgroundImage(
        { CF_ACCOUNT_ID: "acc1", CF_API_TOKEN: "tok1" },
        "a cat",
      ),
    ).rejects.toThrow(/bad prompt/);
  });

  it("throws when the HTTP call itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 500 })),
    );

    await expect(
      generateBackgroundImage(
        { CF_ACCOUNT_ID: "acc1", CF_API_TOKEN: "tok1" },
        "a cat",
      ),
    ).rejects.toThrow(/500/);
  });
});

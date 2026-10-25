import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstagramPublishError, publishToInstagram } from "./publish.js";

const config = {
  accessToken: "token-123",
  igUserId: "ig-user-1",
  pollIntervalMs: 0,
  maxPollAttempts: 3,
};

const input = { imageUrl: "https://example.com/photo.jpg", caption: "Hello" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("publishToInstagram", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a container, waits for it to finish, publishes, and fetches the permalink", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/ig-user-1/media")) {
        return jsonResponse({ id: "container-1" });
      }
      if (url.includes("container-1?fields=status_code")) {
        return jsonResponse({ status_code: "FINISHED" });
      }
      if (url.endsWith("/ig-user-1/media_publish")) {
        return jsonResponse({ id: "media-1" });
      }
      if (url.includes("media-1?fields=permalink")) {
        return jsonResponse({ permalink: "https://instagram.com/p/abc" });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToInstagram(config, input);

    expect(result).toEqual({
      mediaId: "media-1",
      permalink: "https://instagram.com/p/abc",
    });
    expect(calls).toHaveLength(4);
  });

  it("polls until status_code becomes FINISHED", async () => {
    let statusCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/ig-user-1/media")) return jsonResponse({ id: "c1" });
      if (url.includes("fields=status_code")) {
        statusCalls += 1;
        return jsonResponse({
          status_code: statusCalls < 2 ? "IN_PROGRESS" : "FINISHED",
        });
      }
      if (url.endsWith("/media_publish")) return jsonResponse({ id: "m1" });
      if (url.includes("fields=permalink")) {
        return jsonResponse({ permalink: "https://instagram.com/p/x" });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToInstagram(config, input);

    expect(statusCalls).toBe(2);
    expect(result.mediaId).toBe("m1");
  });

  it("throws when the container errors out", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/ig-user-1/media")) return jsonResponse({ id: "c1" });
      if (url.includes("fields=status_code")) {
        return jsonResponse({ status_code: "ERROR" });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishToInstagram(config, input)).rejects.toThrow(
      InstagramPublishError,
    );
  });

  it("throws after exhausting poll attempts without finishing", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/ig-user-1/media")) return jsonResponse({ id: "c1" });
      if (url.includes("fields=status_code")) {
        return jsonResponse({ status_code: "IN_PROGRESS" });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishToInstagram(config, input)).rejects.toThrow(
      /Timed out/,
    );
  });

  it("throws when container creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 400 })),
    );

    await expect(publishToInstagram(config, input)).rejects.toThrow(
      InstagramPublishError,
    );
  });

  it("returns an empty permalink (not a failure) when the permalink fetch fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/ig-user-1/media")) return jsonResponse({ id: "c1" });
      if (url.includes("fields=status_code")) {
        return jsonResponse({ status_code: "FINISHED" });
      }
      if (url.endsWith("/media_publish")) return jsonResponse({ id: "m1" });
      if (url.includes("fields=permalink")) {
        return new Response("server error", { status: 500 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToInstagram(config, input);
    expect(result).toEqual({ mediaId: "m1", permalink: "" });
  });
});

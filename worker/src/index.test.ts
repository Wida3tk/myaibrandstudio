import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyFirebaseIdToken: vi.fn(),
  getGoogleAccessToken: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  sumTokensForDate: vi.fn(),
}));

vi.mock("./auth/verify-token.js", () => ({
  verifyFirebaseIdToken: mocks.verifyFirebaseIdToken,
}));

vi.mock("./auth/service-account.js", () => ({
  getGoogleAccessToken: mocks.getGoogleAccessToken,
}));

vi.mock("./firestore/client.js", () => ({
  createFirestoreClient: () => ({
    getDocument: mocks.getDocument,
    createDocument: mocks.createDocument,
    updateDocument: mocks.updateDocument,
    sumTokensForDate: mocks.sumTokensForDate,
  }),
}));

const worker = (await import("./index.js")).default;

const env = {
  FIREBASE_PROJECT_ID: "proj",
  ALLOWED_ORIGINS: "http://localhost:3000",
  GCP_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "x@y.iam.gserviceaccount.com",
    private_key: "fake",
  }),
  GROQ_API_KEY: "groq-key",
  MISTRAL_API_KEY: "mistral-key",
  OPENROUTER_API_KEY: "openrouter-key",
  IG_ACCESS_TOKEN: "ig-token",
  IG_USER_ID: "ig-user-1",
  CF_ACCOUNT_ID: "cf-account-1",
  CF_API_TOKEN: "cf-token",
};

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://worker.example/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function publishRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://worker.example/publish/instagram", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function creativeBriefRequest(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("https://worker.example/creative/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function creativeImageRequest(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("https://worker.example/creative/image", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  orgId: "org1",
  brandId: "brand1",
  contentType: "post",
  language: "en",
  topic: "launch",
};

describe("worker fetch handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getGoogleAccessToken.mockResolvedValue("access-token");
    mocks.sumTokensForDate.mockResolvedValue(0);
  });

  it("returns 401 with no Authorization header", async () => {
    const res = await worker.fetch(
      request(validBody),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when the ID token fails verification", async () => {
    mocks.verifyFirebaseIdToken.mockRejectedValue(new Error("bad token"));
    const res = await worker.fetch(
      request(validBody, { Authorization: "Bearer bad" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid request body", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    const res = await worker.fetch(
      request({ orgId: "org1" }, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when the user is not an org member", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument.mockResolvedValue(null);
    const res = await worker.fetch(
      request(validBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the brand doesn't exist", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" }) // member
      .mockResolvedValueOnce(null); // brand
    const res = await worker.fetch(
      request(validBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(404);
  });

  it("returns 429 when the org is over its daily budget", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({ voice: {}, audience: {}, memory: {} });
    mocks.sumTokensForDate.mockResolvedValue(1_000_000);

    const res = await worker.fetch(
      request(validBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(429);
  });

  it("returns 502 when every provider fails", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({ voice: {}, audience: {}, memory: {} });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 500 })),
    );

    const res = await worker.fetch(
      request(validBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(502);
    vi.unstubAllGlobals();
  });

  it("returns 200 and records usage on success", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({
        voice: { tone: "warm" },
        audience: { description: "everyone" },
        memory: { facts: [] },
      });

    const providerResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              hook: "h",
              caption: "c",
              hashtags: [],
              callToAction: "",
            }),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(providerResponse), { status: 200 }),
        ),
    );

    const res = await worker.fetch(
      request(validBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      structured: { caption: string };
      provider: string;
    };
    expect(payload.structured.caption).toBe("c");
    expect(payload.provider).toBe("groq");
    const expectedYyyymm = new Date()
      .toISOString()
      .slice(0, 7)
      .replace("-", "");
    expect(mocks.createDocument).toHaveBeenCalledWith(
      `usage/org1/${expectedYyyymm}`,
      expect.objectContaining({ tokensIn: 10, tokensOut: 20 }),
    );
    vi.unstubAllGlobals();
  });
});

const validCreativeBriefBody = {
  orgId: "org1",
  brandId: "brand1",
  objective: "Promote a new course",
  platform: "ig-post",
  language: "en",
  width: 1080,
  height: 1080,
};

describe("worker fetch handler — /creative/brief", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getGoogleAccessToken.mockResolvedValue("access-token");
    mocks.sumTokensForDate.mockResolvedValue(0);
  });

  it("returns 403 when the user is not an org member", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument.mockResolvedValue(null);
    const res = await worker.fetch(
      creativeBriefRequest(validCreativeBriefBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with a validated spec on success", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({
        name: "Acme",
        voice: { tone: "warm" },
        audience: { description: "everyone" },
        memory: { facts: [] },
        visual: { primaryColor: "#6750D8", logoUrl: "" },
      });

    const spec = {
      campaignConcept: "Bold launch",
      headline: "New course, new you",
      supportingCopy: "Enroll today.",
      cta: "Enroll now",
      visualDirection: "Warm editorial photography",
      colorPalette: ["#6750D8", "#F8F6F2"],
      imagePrompts: ["A warm, softly lit desk, editorial photography"],
      layoutComposition: "Full-bleed background, headline lower third",
      typographyHierarchy: { headline: "bold", body: "regular", cta: "bold pill" },
      platformDimensions: { width: 1, height: 1 }, // the handler must override this with the request's own size
      brandConstraints: [],
    };
    const providerResponse = {
      choices: [{ message: { content: JSON.stringify(spec) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(providerResponse), { status: 200 })),
    );

    const res = await worker.fetch(
      creativeBriefRequest(validCreativeBriefBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      spec: { headline: string; platformDimensions: { width: number; height: number } };
      provider: string;
    };
    expect(payload.spec.headline).toBe("New course, new you");
    expect(payload.spec.platformDimensions).toEqual({ width: 1080, height: 1080 });
    expect(payload.provider).toBe("groq");
    vi.unstubAllGlobals();
  });
});

describe("worker fetch handler — /creative/image", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getGoogleAccessToken.mockResolvedValue("access-token");
  });

  it("returns available:false rather than an error when the image provider is unconfigured", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument.mockResolvedValueOnce({ role: "owner" }).mockResolvedValueOnce({});

    const res = await worker.fetch(
      creativeImageRequest(
        { orgId: "org1", brandId: "brand1", prompt: "a cat" },
        { Authorization: "Bearer ok" },
      ),
      { ...env, CF_ACCOUNT_ID: "", CF_API_TOKEN: "" },
      {} as ExecutionContext,
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as { available: boolean; reason?: string };
    expect(payload).toEqual({ available: false, reason: "unavailable" });
  });

  it("returns the generated image on success", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument.mockResolvedValueOnce({ role: "owner" }).mockResolvedValueOnce({});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { image: "b64" } }), {
          status: 200,
        }),
      ),
    );

    const res = await worker.fetch(
      creativeImageRequest(
        { orgId: "org1", brandId: "brand1", prompt: "a cat" },
        { Authorization: "Bearer ok" },
      ),
      env,
      {} as ExecutionContext,
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as { available: boolean; base64: string };
    expect(payload).toEqual({
      available: true,
      base64: "b64",
      mimeType: "image/jpeg",
      provider: "cloudflare-workers-ai",
    });
    vi.unstubAllGlobals();
  });
});

const validPublishBody = {
  orgId: "org1",
  brandId: "brand1",
  contentItemId: "item1",
  imageUrl: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
  caption: "Check this out",
};

describe("worker fetch handler — /publish/instagram", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getGoogleAccessToken.mockResolvedValue("access-token");
  });

  it("returns 403 when the user is not an org member", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument.mockResolvedValue(null);
    const res = await worker.fetch(
      publishRequest(validPublishBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the content item doesn't exist", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" }) // member
      .mockResolvedValueOnce(null); // content item
    const res = await worker.fetch(
      publishRequest(validPublishBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(404);
  });

  it("returns 502 when the Instagram call fails", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({ status: "approved", history: [] });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 400 })),
    );

    const res = await worker.fetch(
      publishRequest(validPublishBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );
    expect(res.status).toBe(502);
    vi.unstubAllGlobals();
  });

  it("returns 200 and updates the content item on success", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1" });
    mocks.getDocument
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({ status: "approved", history: [] });

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/ig-user-1/media")) {
        return new Response(JSON.stringify({ id: "container-1" }), {
          status: 200,
        });
      }
      if (url.includes("fields=status_code")) {
        return new Response(JSON.stringify({ status_code: "FINISHED" }), {
          status: 200,
        });
      }
      if (url.endsWith("/ig-user-1/media_publish")) {
        return new Response(JSON.stringify({ id: "media-1" }), {
          status: 200,
        });
      }
      if (url.includes("fields=permalink")) {
        return new Response(
          JSON.stringify({ permalink: "https://instagram.com/p/abc" }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await worker.fetch(
      publishRequest(validPublishBody, { Authorization: "Bearer ok" }),
      env,
      {} as ExecutionContext,
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      mediaId: string;
      permalink: string;
    };
    expect(payload).toEqual({
      mediaId: "media-1",
      permalink: "https://instagram.com/p/abc",
    });
    expect(mocks.updateDocument).toHaveBeenCalledWith(
      "organizations/org1/brands/brand1/contentItems/item1",
      expect.objectContaining({
        status: "published",
        publishes: {
          instagram: expect.objectContaining({ mediaId: "media-1" }),
        },
      }),
      ["status", "history", "publishes.instagram"],
    );
    vi.unstubAllGlobals();
  });
});

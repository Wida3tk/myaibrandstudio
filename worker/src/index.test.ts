import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyFirebaseIdToken: vi.fn(),
  getGoogleAccessToken: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
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
    sumTokensForDate: mocks.sumTokensForDate,
  }),
}));

const worker = (await import("./index.js")).default;

const env = {
  FIREBASE_PROJECT_ID: "proj",
  ALLOWED_ORIGIN: "http://localhost:3000",
  GCP_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "x@y.iam.gserviceaccount.com",
    private_key: "fake",
  }),
  GROQ_API_KEY: "groq-key",
  MISTRAL_API_KEY: "mistral-key",
  OPENROUTER_API_KEY: "openrouter-key",
};

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://worker.example/generate", {
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

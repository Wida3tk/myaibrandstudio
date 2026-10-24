import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT, generateKeyPair } from "jose";

const mocks = vi.hoisted(() => ({ importX509: vi.fn() }));

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return { ...actual, importX509: mocks.importX509 };
});

const { verifyFirebaseIdToken } = await import("./verify-token.js");

const PROJECT_ID = "myaibrandstudio-dev";

function mockCertsEndpoint(certs: Record<string, string>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(certs), {
        headers: { "cache-control": "max-age=3600" },
      }),
    ),
  );
}

describe("verifyFirebaseIdToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("verifies a well-formed token and returns the uid", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    mocks.importX509.mockResolvedValue(publicKey);
    const kid = "test-kid";

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setAudience(PROJECT_ID)
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    mockCertsEndpoint({ [kid]: "fake-pem" });

    const result = await verifyFirebaseIdToken(token, PROJECT_ID);
    expect(result.uid).toBe("user-123");
  });

  it("rejects a token issued for a different Firebase project", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    mocks.importX509.mockResolvedValue(publicKey);
    const kid = "test-kid-2";

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setAudience("some-other-project")
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    mockCertsEndpoint({ [kid]: "fake-pem" });

    await expect(verifyFirebaseIdToken(token, PROJECT_ID)).rejects.toThrow();
  });

  it("rejects when no certificate matches the token's kid", async () => {
    const { privateKey } = await generateKeyPair("RS256");

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "unknown-kid" })
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setAudience(PROJECT_ID)
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    mockCertsEndpoint({ "different-kid": "fake-pem" });

    await expect(verifyFirebaseIdToken(token, PROJECT_ID)).rejects.toThrow(
      "No matching certificate",
    );
  });

  it("rejects a malformed token", async () => {
    await expect(
      verifyFirebaseIdToken("not-a-jwt", PROJECT_ID),
    ).rejects.toThrow();
  });
});

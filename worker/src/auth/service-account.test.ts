import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportPKCS8, generateKeyPair } from "jose";
import { getGoogleAccessToken } from "./service-account.js";

describe("getGoogleAccessToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("exchanges a signed JWT for an access token", async () => {
    const { privateKey } = await generateKeyPair("RS256", {
      extractable: true,
    });
    const pem = await exportPKCS8(privateKey);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "fake-access-token" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const token = await getGoogleAccessToken(
      {
        client_email: "test@example.iam.gserviceaccount.com",
        private_key: pem,
      },
      "https://www.googleapis.com/auth/datastore",
    );

    expect(token).toBe("fake-access-token");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws with the response body when the token endpoint rejects the request", async () => {
    const { privateKey } = await generateKeyPair("RS256", {
      extractable: true,
    });
    const pem = await exportPKCS8(privateKey);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("invalid_grant", { status: 400 })),
    );

    await expect(
      getGoogleAccessToken(
        {
          client_email: "test@example.iam.gserviceaccount.com",
          private_key: pem,
        },
        "https://www.googleapis.com/auth/datastore",
      ),
    ).rejects.toThrow("invalid_grant");
  });
});

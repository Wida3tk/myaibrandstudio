import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFirestoreClient,
  decodeFields,
  encodeFields,
  type FirestoreValue,
} from "./client.js";

describe("encodeFields / decodeFields round-trip", () => {
  it("round-trips strings, numbers, booleans, null, arrays and nested objects", () => {
    const input = {
      name: "Acme",
      count: 3,
      ratio: 1.5,
      active: true,
      missing: null,
      tags: ["a", "b"],
      nested: { tone: "warm" },
    };

    const encoded = encodeFields(input);
    const decoded = decodeFields(encoded);

    expect(decoded).toEqual(input);
  });
});

describe("createFirestoreClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("getDocument returns null for a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 })),
    );
    const client = createFirestoreClient("proj", "token");
    const result = await client.getDocument("organizations/org1/members/u1");
    expect(result).toBeNull();
  });

  it("getDocument decodes a found document's fields", async () => {
    const fields: Record<string, FirestoreValue> = {
      role: { stringValue: "owner" },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ fields }), { status: 200 }),
        ),
    );
    const client = createFirestoreClient("proj", "token");
    const result = await client.getDocument("organizations/org1/members/u1");
    expect(result).toEqual({ role: "owner" });
  });

  it("createDocument POSTs encoded fields to the collection path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createFirestoreClient("proj", "token");

    await client.createDocument("usage/org1/202610", {
      tokensIn: 10,
      tokensOut: 20,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://firestore.googleapis.com/v1/projects/proj/databases/(default)/documents/usage/org1/202610",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sumTokensForDate sums tokensIn + tokensOut across matching documents", async () => {
    const rows = [
      {
        document: {
          fields: {
            tokensIn: { integerValue: "10" },
            tokensOut: { integerValue: "5" },
            date: { stringValue: "2026-10-24" },
          },
        },
      },
      {
        document: {
          fields: {
            tokensIn: { integerValue: "3" },
            tokensOut: { integerValue: "2" },
            date: { stringValue: "2026-10-24" },
          },
        },
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 })),
    );

    const client = createFirestoreClient("proj", "token");
    const total = await client.sumTokensForDate(
      "usage/org1/202610",
      "2026-10-24",
    );

    expect(total).toBe(20);
  });

  it("sumTokensForDate returns 0 for an empty result set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("[]", { status: 200 })),
    );
    const client = createFirestoreClient("proj", "token");
    const total = await client.sumTokensForDate(
      "usage/org1/202610",
      "2026-10-24",
    );
    expect(total).toBe(0);
  });
});

// A small, targeted Firestore REST client — not a general-purpose SDK. Encodes/decodes only the
// plain JSON shapes this Worker actually sends and receives; see
// https://firebase.google.com/docs/firestore/reference/rest/v1/Value for the full format this is
// a subset of.

export interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
  timestampValue?: string;
}

export function decodeValue(value: FirestoreValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.mapValue) return decodeFields(value.mapValue.fields);
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decodeValue);
  if (value.timestampValue !== undefined) return value.timestampValue;
  return undefined;
}

export function decodeFields(
  fields: Record<string, FirestoreValue> | undefined,
): Record<string, unknown> {
  if (!fields) return {};
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

export function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: { fields: encodeFields(value as Record<string, unknown>) },
    };
  }
  throw new Error(`Cannot encode Firestore value: ${String(value)}`);
}

export function encodeFields(
  obj: Record<string, unknown>,
): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, encodeValue(value)]),
  );
}

export interface FirestoreClient {
  /** `path` like "organizations/{orgId}/members/{uid}". Returns null if the document doesn't exist. */
  getDocument(path: string): Promise<Record<string, unknown> | null>;
  /** `collectionPath` like "usage/{orgId}/{yyyymm}". Creates a document with an auto-generated id. */
  createDocument(
    collectionPath: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  /** Sums `tokensIn + tokensOut` across documents in `collectionPath` where `date` equals `date`. */
  sumTokensForDate(collectionPath: string, date: string): Promise<number>;
  /**
   * Partial update: only `fieldPaths` are touched (dotted paths like "publishes.instagram" update
   * just that nested key, leaving sibling keys alone — Firestore's updateMask semantics).
   */
  updateDocument(
    path: string,
    data: Record<string, unknown>,
    fieldPaths: string[],
  ): Promise<void>;
}

export function createFirestoreClient(
  projectId: string,
  accessToken: string,
): FirestoreClient {
  const documentsBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  async function request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${documentsBase}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }

  return {
    async getDocument(path) {
      const res = await request(path);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(
          `Firestore getDocument(${path}) failed: ${res.status} ${await res.text()}`,
        );
      }
      const data = (await res.json()) as {
        fields?: Record<string, FirestoreValue>;
      };
      return decodeFields(data.fields);
    },

    async createDocument(collectionPath, data) {
      const res = await request(collectionPath, {
        method: "POST",
        body: JSON.stringify({ fields: encodeFields(data) }),
      });
      if (!res.ok) {
        throw new Error(
          `Firestore createDocument(${collectionPath}) failed: ${res.status} ${await res.text()}`,
        );
      }
    },

    async updateDocument(path, data, fieldPaths) {
      const mask = fieldPaths
        .map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`)
        .join("&");
      const res = await request(`${path}?${mask}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: encodeFields(data) }),
      });
      if (!res.ok) {
        throw new Error(
          `Firestore updateDocument(${path}) failed: ${res.status} ${await res.text()}`,
        );
      }
    },

    async sumTokensForDate(collectionPath, date) {
      const segments = collectionPath.split("/");
      const collectionId = segments.pop();
      const parentPath = segments.join("/");
      const parent = parentPath
        ? `projects/${projectId}/databases/(default)/documents/${parentPath}`
        : `projects/${projectId}/databases/(default)/documents`;

      const res = await fetch(
        `https://firestore.googleapis.com/v1/${parent}:runQuery`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId }],
              where: {
                fieldFilter: {
                  field: { fieldPath: "date" },
                  op: "EQUAL",
                  value: { stringValue: date },
                },
              },
            },
          }),
        },
      );

      if (!res.ok) {
        throw new Error(
          `Firestore sumTokensForDate(${collectionPath}) failed: ${res.status} ${await res.text()}`,
        );
      }

      const rows = (await res.json()) as Array<{
        document?: { fields?: Record<string, FirestoreValue> };
      }>;

      return rows.reduce((sum, row) => {
        const fields = row.document?.fields;
        if (!fields) return sum;
        const doc = decodeFields(fields);
        const tokensIn = Number(doc.tokensIn ?? 0);
        const tokensOut = Number(doc.tokensOut ?? 0);
        return sum + tokensIn + tokensOut;
      }, 0);
    },
  };
}

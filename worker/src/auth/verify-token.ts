import { importX509, jwtVerify, type JWTPayload } from "jose";

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Firebase rotates these certs roughly daily; a simple module-scope cache (honoring the response's
// own Cache-Control max-age) avoids a round trip on every request within a Worker isolate's
// lifetime, without needing the Workers Cache API for a cache this small and short-lived.
let certsCache: { certs: Record<string, string>; expiresAt: number } | null =
  null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certsCache && certsCache.expiresAt > Date.now()) {
    return certsCache.certs;
  }

  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google certs: ${res.status}`);
  }
  const certs = (await res.json()) as Record<string, string>;

  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60_000;

  certsCache = { certs, expiresAt: Date.now() + maxAgeMs };
  return certs;
}

export interface VerifiedToken {
  uid: string;
  payload: JWTPayload;
}

/**
 * Verifies a Firebase Auth ID token the same way the Admin SDK would, without the Admin SDK
 * (which needs Node APIs this edge runtime doesn't have). See
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 * for the algorithm this follows.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
): Promise<VerifiedToken> {
  const [headerB64] = idToken.split(".");
  if (!headerB64) {
    throw new Error("Malformed token");
  }
  const header = JSON.parse(
    atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")),
  ) as {
    kid?: string;
    alg?: string;
  };
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unexpected token header");
  }

  const certs = await getGoogleCerts();
  const pem = certs[header.kid];
  if (!pem) {
    throw new Error("No matching certificate for token kid");
  }

  const publicKey = await importX509(pem, "RS256");

  const { payload } = await jwtVerify(idToken, publicKey, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) {
    throw new Error("Token missing subject");
  }

  return { uid: payload.sub, payload };
}

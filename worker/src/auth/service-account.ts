import { SignJWT, importPKCS8 } from "jose";

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * Exchanges a Google service account's private key for a short-lived OAuth2 access token
 * (the JWT-bearer flow), using the Web Crypto API via jose — no Node APIs, so this runs on
 * Cloudflare Workers directly. Mirrors what the Admin SDK does internally.
 */
export async function getGoogleAccessToken(
  serviceAccount: ServiceAccount,
  scope: string,
): Promise<string> {
  const key = await importPKCS8(serviceAccount.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Service account token exchange failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

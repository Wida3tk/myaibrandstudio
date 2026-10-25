import { z } from "zod";
import { verifyFirebaseIdToken } from "./auth/verify-token.js";
import {
  getGoogleAccessToken,
  type ServiceAccount,
} from "./auth/service-account.js";
import {
  createFirestoreClient,
  type FirestoreClient,
} from "./firestore/client.js";
import { generateWithFallback } from "./gateway/router.js";
import { isWithinBudget } from "./gateway/budget.js";
import { createGroqProvider } from "./gateway/providers/groq.js";
import { createMistralProvider } from "./gateway/providers/mistral.js";
import { createOpenRouterProvider } from "./gateway/providers/openrouter.js";
import type { AIProvider } from "./gateway/types.js";
import {
  InstagramPublishError,
  publishToInstagram,
} from "./instagram/publish.js";
import { creativeBriefRequestSchema } from "./gateway/creative/schema.js";
import { createCreativeDirectorProviders } from "./gateway/creative/providers.js";
import {
  generateBackgroundImage,
  ImageProviderUnavailableError,
} from "./gateway/creative/image.js";
import { reviseRequestSchema } from "./gateway/creative/revise-schema.js";
import { createRevisionProviders } from "./gateway/creative/revise-providers.js";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  /** Comma-separated list of allowed origins (e.g. local dev + Firebase Hosting domains). */
  ALLOWED_ORIGINS: string;
  GCP_SERVICE_ACCOUNT_JSON: string;
  GROQ_API_KEY: string;
  MISTRAL_API_KEY: string;
  OPENROUTER_API_KEY: string;
  IG_ACCESS_TOKEN: string;
  IG_USER_ID: string;
  /** Cloudflare account id — not a secret, same category as IG_USER_ID (see wrangler.toml). */
  CF_ACCOUNT_ID: string;
  /** API token scoped to Workers AI:Read/Edit — see docs/07-cloudflare-worker-setup.md §6. */
  CF_API_TOKEN: string;
}

// Conservative default; per-org configurable budgets are later work (see
// docs/03-data-model.md's providerConfigs collection), not needed to ship a working v1.
const DAILY_TOKEN_LIMIT = 50_000;

const generateRequestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  contentType: z.enum(["post", "hook", "caption", "script", "calendar-note"]),
  language: z.enum(["ar", "en"]),
  topic: z.string().trim().min(1).max(500),
  // Optional per-generation overrides layered onto the brand's stored defaults.
  toneOverride: z.string().trim().max(200).optional(),
  audienceOverride: z.string().trim().max(500).optional(),
  pillars: z.array(z.string().trim().min(1)).max(10).optional(),
  customInstructions: z.string().trim().max(1000).optional(),
});

const creativeImageRequestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  prompt: z.string().trim().min(1).max(400),
});

const publishRequestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  contentItemId: z.string().min(1),
  imageUrl: z.string().url(),
  caption: z.string().trim().min(1).max(2200),
});

function corsHeaders(
  requestOrigin: string | null,
  allowedOrigins: string,
): Record<string, string> {
  const allowed = allowedOrigins.split(",").map((o) => o.trim());
  const origin =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : allowed[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  body: unknown,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function handleGenerateContent(
  request: Request,
  env: Env,
  uid: string,
  firestore: FirestoreClient,
  headers: Record<string, string>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid-json" }, 400, headers);
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid-argument", message: parsed.error.issues[0]?.message },
      400,
      headers,
    );
  }
  const {
    orgId,
    brandId,
    contentType,
    language,
    topic,
    toneOverride,
    audienceOverride,
    pillars,
    customInstructions,
  } = parsed.data;

  const member = await firestore.getDocument(
    `organizations/${orgId}/members/${uid}`,
  );
  if (!member) {
    return json({ error: "permission-denied" }, 403, headers);
  }

  const brand = await firestore.getDocument(
    `organizations/${orgId}/brands/${brandId}`,
  );
  if (!brand) {
    return json({ error: "not-found" }, 404, headers);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yyyymm = today.slice(0, 7).replace("-", "");
  const usageCollectionPath = `usage/${orgId}/${yyyymm}`;

  const tokensUsedToday = await firestore.sumTokensForDate(
    usageCollectionPath,
    today,
  );
  if (
    !isWithinBudget({ tokensUsedToday }, { dailyTokenLimit: DAILY_TOKEN_LIMIT })
  ) {
    return json({ error: "resource-exhausted" }, 429, headers);
  }

  const brandDoc = brand as {
    voice?: { tone?: string };
    audience?: { description?: string };
    memory?: { facts?: string[] };
  };

  const providers: AIProvider[] = [
    createGroqProvider(env.GROQ_API_KEY),
    createMistralProvider(env.MISTRAL_API_KEY),
    createOpenRouterProvider(env.OPENROUTER_API_KEY),
  ];

  let result;
  try {
    result = await generateWithFallback(
      {
        orgId,
        brandId,
        contentType,
        language,
        brandVoice: brandDoc.voice?.tone ?? "",
        brandAudience: brandDoc.audience?.description ?? "",
        brandMemoryFacts: brandDoc.memory?.facts ?? [],
        topic,
        toneOverride,
        audienceOverride,
        pillars,
        customInstructions,
      },
      providers,
    );
  } catch (error) {
    console.error("generateWithFallback failed", error);
    return json({ error: "all-providers-failed" }, 502, headers);
  }

  await firestore.createDocument(usageCollectionPath, {
    provider: result.provider,
    model: result.model,
    brandId,
    contentType,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    date: today,
    createdAt: new Date().toISOString(),
  });

  return json(
    { structured: result.structured, provider: result.provider },
    200,
    headers,
  );
}

async function handleCreativeBrief(
  request: Request,
  env: Env,
  uid: string,
  firestore: FirestoreClient,
  headers: Record<string, string>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid-json" }, 400, headers);
  }

  const parsed = creativeBriefRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid-argument", message: parsed.error.issues[0]?.message },
      400,
      headers,
    );
  }
  const { orgId, brandId, ...brief } = parsed.data;

  const member = await firestore.getDocument(
    `organizations/${orgId}/members/${uid}`,
  );
  if (!member) {
    return json({ error: "permission-denied" }, 403, headers);
  }

  const brand = await firestore.getDocument(
    `organizations/${orgId}/brands/${brandId}`,
  );
  if (!brand) {
    return json({ error: "not-found" }, 404, headers);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yyyymm = today.slice(0, 7).replace("-", "");
  const usageCollectionPath = `usage/${orgId}/${yyyymm}`;

  const tokensUsedToday = await firestore.sumTokensForDate(
    usageCollectionPath,
    today,
  );
  if (
    !isWithinBudget({ tokensUsedToday }, { dailyTokenLimit: DAILY_TOKEN_LIMIT })
  ) {
    return json({ error: "resource-exhausted" }, 429, headers);
  }

  const brandDoc = brand as {
    name?: string;
    voice?: { tone?: string };
    audience?: { description?: string };
    memory?: { facts?: string[] };
    visual?: { primaryColor?: string; logoUrl?: string };
  };

  let result;
  try {
    result = await generateWithFallback(
      {
        orgId,
        brandId,
        ...brief,
        brandName: brandDoc.name ?? "",
        brandVoice: brandDoc.voice?.tone ?? "",
        brandAudience: brandDoc.audience?.description ?? "",
        brandMemoryFacts: brandDoc.memory?.facts ?? [],
        brandPrimaryColor: brandDoc.visual?.primaryColor ?? "",
        brandHasLogo: Boolean(brandDoc.visual?.logoUrl),
      },
      createCreativeDirectorProviders(env),
    );
  } catch (error) {
    console.error("creative director generateWithFallback failed", error);
    return json({ error: "all-providers-failed" }, 502, headers);
  }

  await firestore.createDocument(usageCollectionPath, {
    provider: result.provider,
    model: result.model,
    brandId,
    contentType: "creative-brief",
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    date: today,
    createdAt: new Date().toISOString(),
  });

  return json({ spec: result.spec, provider: result.provider }, 200, headers);
}

async function handleCreativeImage(
  request: Request,
  env: Env,
  uid: string,
  firestore: FirestoreClient,
  headers: Record<string, string>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid-json" }, 400, headers);
  }

  const parsed = creativeImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid-argument", message: parsed.error.issues[0]?.message },
      400,
      headers,
    );
  }
  const { orgId, brandId, prompt } = parsed.data;

  const member = await firestore.getDocument(
    `organizations/${orgId}/members/${uid}`,
  );
  if (!member) {
    return json({ error: "permission-denied" }, 403, headers);
  }
  const brand = await firestore.getDocument(
    `organizations/${orgId}/brands/${brandId}`,
  );
  if (!brand) {
    return json({ error: "not-found" }, 404, headers);
  }

  try {
    const image = await generateBackgroundImage(env, prompt);
    return json({ available: true, ...image }, 200, headers);
  } catch (error) {
    if (error instanceof ImageProviderUnavailableError) {
      return json({ available: false, reason: "unavailable" }, 200, headers);
    }
    console.error("generateBackgroundImage failed", error);
    return json({ available: false, reason: "failed" }, 200, headers);
  }
}

async function handleCreativeRevise(
  request: Request,
  env: Env,
  uid: string,
  firestore: FirestoreClient,
  headers: Record<string, string>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid-json" }, 400, headers);
  }

  const parsed = reviseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid-argument", message: parsed.error.issues[0]?.message },
      400,
      headers,
    );
  }
  const { orgId, brandId } = parsed.data;

  const member = await firestore.getDocument(
    `organizations/${orgId}/members/${uid}`,
  );
  if (!member) {
    return json({ error: "permission-denied" }, 403, headers);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yyyymm = today.slice(0, 7).replace("-", "");
  const usageCollectionPath = `usage/${orgId}/${yyyymm}`;

  const tokensUsedToday = await firestore.sumTokensForDate(
    usageCollectionPath,
    today,
  );
  if (
    !isWithinBudget({ tokensUsedToday }, { dailyTokenLimit: DAILY_TOKEN_LIMIT })
  ) {
    return json({ error: "resource-exhausted" }, 429, headers);
  }

  let result;
  try {
    result = await generateWithFallback(parsed.data, createRevisionProviders(env));
  } catch (error) {
    console.error("creative revision generateWithFallback failed", error);
    return json({ error: "all-providers-failed" }, 502, headers);
  }

  await firestore.createDocument(usageCollectionPath, {
    provider: result.provider,
    model: result.model,
    brandId,
    contentType: "creative-revise",
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    date: today,
    createdAt: new Date().toISOString(),
  });

  return json({ ops: result.ops, provider: result.provider }, 200, headers);
}

async function handleInstagramPublish(
  request: Request,
  env: Env,
  uid: string,
  firestore: FirestoreClient,
  headers: Record<string, string>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid-json" }, 400, headers);
  }

  const parsed = publishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid-argument", message: parsed.error.issues[0]?.message },
      400,
      headers,
    );
  }
  const { orgId, brandId, contentItemId, imageUrl, caption } = parsed.data;

  const member = await firestore.getDocument(
    `organizations/${orgId}/members/${uid}`,
  );
  if (!member) {
    return json({ error: "permission-denied" }, 403, headers);
  }

  const itemPath = `organizations/${orgId}/brands/${brandId}/contentItems/${contentItemId}`;
  const item = await firestore.getDocument(itemPath);
  if (!item) {
    return json({ error: "not-found" }, 404, headers);
  }

  let result;
  try {
    result = await publishToInstagram(
      { accessToken: env.IG_ACCESS_TOKEN, igUserId: env.IG_USER_ID },
      { imageUrl, caption },
    );
  } catch (error) {
    console.error("publishToInstagram failed", error);
    const message =
      error instanceof InstagramPublishError
        ? error.message
        : "Instagram publish failed.";
    return json({ error: "publish-failed", message }, 502, headers);
  }

  const publishedAt = new Date().toISOString();
  const existingHistory = Array.isArray(item.history) ? item.history : [];

  await firestore.updateDocument(
    itemPath,
    {
      status: "published",
      history: [
        ...existingHistory,
        {
          uid,
          action: "published_instagram",
          fromStatus: (item.status as string) ?? null,
          toStatus: "published",
          at: publishedAt,
        },
      ],
      publishes: {
        instagram: {
          mediaId: result.mediaId,
          permalink: result.permalink,
          publishedAt,
        },
      },
    },
    ["status", "history", "publishes.instagram"],
  );

  return json(
    { mediaId: result.mediaId, permalink: result.permalink },
    200,
    headers,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(
      request.headers.get("Origin"),
      env.ALLOWED_ORIGINS,
    );

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }
    if (request.method !== "POST") {
      return json({ error: "method-not-allowed" }, 405, headers);
    }

    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.match(/^Bearer (.+)$/)?.[1];
    if (!idToken) {
      return json({ error: "unauthenticated" }, 401, headers);
    }

    let uid: string;
    try {
      ({ uid } = await verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID));
    } catch {
      return json({ error: "unauthenticated" }, 401, headers);
    }

    const serviceAccount = JSON.parse(
      env.GCP_SERVICE_ACCOUNT_JSON,
    ) as ServiceAccount;
    const accessToken = await getGoogleAccessToken(
      serviceAccount,
      "https://www.googleapis.com/auth/datastore",
    );
    const firestore = createFirestoreClient(
      env.FIREBASE_PROJECT_ID,
      accessToken,
    );

    const { pathname } = new URL(request.url);
    if (pathname === "/publish/instagram") {
      return handleInstagramPublish(request, env, uid, firestore, headers);
    }
    if (pathname === "/creative/brief") {
      return handleCreativeBrief(request, env, uid, firestore, headers);
    }
    if (pathname === "/creative/image") {
      return handleCreativeImage(request, env, uid, firestore, headers);
    }
    if (pathname === "/creative/revise") {
      return handleCreativeRevise(request, env, uid, firestore, headers);
    }

    return handleGenerateContent(request, env, uid, firestore, headers);
  },
} satisfies ExportedHandler<Env>;

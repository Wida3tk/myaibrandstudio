import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { generateWithFallback } from "./gateway/router.js";
import { isWithinBudget } from "./gateway/budget.js";
import { createGroqProvider } from "./gateway/providers/groq.js";
import { createMistralProvider } from "./gateway/providers/mistral.js";
import { createOpenRouterProvider } from "./gateway/providers/openrouter.js";
import type { AIProvider } from "./gateway/types.js";

initializeApp();

const groqApiKey = defineSecret("GROQ_API_KEY");
const mistralApiKey = defineSecret("MISTRAL_API_KEY");
const openrouterApiKey = defineSecret("OPENROUTER_API_KEY");

// Conservative default; per-org configurable budgets are later work (see
// docs/03-data-model.md's providerConfigs collection), not needed to ship a working v1.
const DAILY_TOKEN_LIMIT = 50_000;

const requestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  contentType: z.enum(["post", "hook", "caption", "script", "calendar-note"]),
  language: z.enum(["ar", "en"]),
  topic: z.string().trim().min(1).max(500),
});

export const generateContent = onCall(
  { secrets: [groqApiKey, mistralApiKey, openrouterApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues[0]?.message ?? "Invalid request.",
      );
    }
    const { orgId, brandId, contentType, language, topic } = parsed.data;

    const db = getFirestore();
    const uid = request.auth.uid;

    const memberSnap = await db
      .doc(`organizations/${orgId}/members/${uid}`)
      .get();
    if (!memberSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "Not a member of this organization.",
      );
    }

    const brandSnap = await db
      .doc(`organizations/${orgId}/brands/${brandId}`)
      .get();
    if (!brandSnap.exists) {
      throw new HttpsError("not-found", "Brand not found.");
    }
    const brand = brandSnap.data() as {
      voice?: { tone?: string };
      audience?: { description?: string };
      memory?: { facts?: string[] };
    };

    const today = new Date().toISOString().slice(0, 10);
    const yyyymm = today.slice(0, 7).replace("-", "");
    const usageCollection = db.collection(`usage/${orgId}/${yyyymm}`);

    const usageSnap = await usageCollection.where("date", "==", today).get();
    const tokensUsedToday = usageSnap.docs.reduce(
      (sum, doc) =>
        sum + ((doc.data().tokensIn ?? 0) + (doc.data().tokensOut ?? 0)),
      0,
    );

    if (
      !isWithinBudget(
        { tokensUsedToday },
        { dailyTokenLimit: DAILY_TOKEN_LIMIT },
      )
    ) {
      throw new HttpsError(
        "resource-exhausted",
        "Daily AI budget exceeded for this organization.",
      );
    }

    const providers: AIProvider[] = [
      createGroqProvider(groqApiKey.value()),
      createMistralProvider(mistralApiKey.value()),
      createOpenRouterProvider(openrouterApiKey.value()),
    ];

    const result = await generateWithFallback(
      {
        orgId,
        brandId,
        contentType,
        language,
        brandVoice: brand.voice?.tone ?? "",
        brandAudience: brand.audience?.description ?? "",
        brandMemoryFacts: brand.memory?.facts ?? [],
        topic,
      },
      providers,
    );

    await usageCollection.add({
      provider: result.provider,
      model: result.model,
      brandId,
      contentType,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      date: today,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      structured: result.structured,
      provider: result.provider,
    };
  },
);

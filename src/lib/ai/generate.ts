import { getFirebaseAuth } from "@/lib/firebase/client";
import type { ContentType, Language } from "./types";

export interface GenerateContentInput {
  orgId: string;
  brandId: string;
  contentType: ContentType;
  language: Language;
  topic: string;
  /** Per-generation overrides layered onto the brand's stored defaults — all optional. */
  toneOverride?: string;
  audienceOverride?: string;
  pillars?: string[];
  customInstructions?: string;
}

export interface GeneratedContent {
  hook: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
}

export interface GenerateContentOutput {
  structured: GeneratedContent;
  provider: string;
}

/** Error codes the Worker returns — see worker/src/index.ts handleGenerateContent. */
export type GenerationErrorCode =
  | "invalid-argument"
  | "permission-denied"
  | "not-found"
  | "resource-exhausted"
  | "all-providers-failed"
  | "unknown";

export class GenerationError extends Error {
  code: GenerationErrorCode;
  constructor(code: GenerationErrorCode, message: string) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
  }
}

const KNOWN_CODES: GenerationErrorCode[] = [
  "invalid-argument",
  "permission-denied",
  "not-found",
  "resource-exhausted",
  "all-providers-failed",
];

const FRIENDLY_MESSAGE: Record<GenerationErrorCode, string> = {
  "invalid-argument": "That request wasn't valid — check the fields and try again.",
  "permission-denied": "You don't have access to generate content for this brand.",
  "not-found": "This brand profile couldn't be found.",
  "resource-exhausted":
    "Today's AI generation budget for this workspace is used up — try again tomorrow, or ask an owner to raise the limit.",
  "all-providers-failed":
    "All AI providers are temporarily unavailable. This is usually transient — wait a moment and retry.",
  unknown: "Generation failed. Please try again.",
};

function requiredGatewayUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_GATEWAY_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_AI_GATEWAY_URL. Copy .env.example to .env.local and fill in the deployed Cloudflare Worker URL (see docs/06-firebase-setup.md).",
    );
  }
  return url;
}

export async function generateContent(
  input: GenerateContentInput,
): Promise<GenerateContentOutput> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Sign in required.");
  }
  const idToken = await user.getIdToken();

  const res = await fetch(requiredGatewayUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const code = KNOWN_CODES.includes(body.error as GenerationErrorCode)
      ? (body.error as GenerationErrorCode)
      : "unknown";
    throw new GenerationError(code, body.message ?? FRIENDLY_MESSAGE[code]);
  }

  return (await res.json()) as GenerateContentOutput;
}

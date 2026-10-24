import { getFirebaseAuth } from "@/lib/firebase/client";
import type { ContentType, Language } from "./types";

export interface GenerateContentInput {
  orgId: string;
  brandId: string;
  contentType: ContentType;
  language: Language;
  topic: string;
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
    throw new Error(
      body.message ?? body.error ?? `Generation failed (${res.status}).`,
    );
  }

  return (await res.json()) as GenerateContentOutput;
}

import { getFirebaseAuth } from "@/lib/firebase/client";
import { GenerationError, type GenerationErrorCode } from "@/lib/ai/generate";
import type { CreativeBrief, CreativeSpec } from "./types";

const KNOWN_CODES: GenerationErrorCode[] = [
  "invalid-argument",
  "permission-denied",
  "not-found",
  "resource-exhausted",
  "all-providers-failed",
];

function requiredGatewayUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_GATEWAY_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_AI_GATEWAY_URL. Copy .env.example to .env.local and fill in the deployed Cloudflare Worker URL (see docs/06-firebase-setup.md).",
    );
  }
  return url;
}

async function authedPost<TBody extends object, TResult>(
  path: string,
  body: TBody,
): Promise<TResult> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Sign in required.");
  }
  const idToken = await user.getIdToken();

  const res = await fetch(`${requiredGatewayUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const responseBody = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const code = KNOWN_CODES.includes(responseBody.error as GenerationErrorCode)
      ? (responseBody.error as GenerationErrorCode)
      : "unknown";
    throw new GenerationError(
      code,
      responseBody.message ?? "Generation failed.",
    );
  }

  return (await res.json()) as TResult;
}

export async function generateCreativeSpec(
  orgId: string,
  brandId: string,
  brief: CreativeBrief,
  dimensions: { width: number; height: number },
): Promise<{ spec: CreativeSpec; provider: string }> {
  return authedPost("/creative/brief", {
    orgId,
    brandId,
    ...brief,
    width: dimensions.width,
    height: dimensions.height,
  });
}

export interface CanvasObjectSummary {
  role: string;
  type: "textbox" | "rect" | "image" | "gradient";
  text?: string;
  fontSize?: number;
  fill?: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export type EditOp = {
  role: string;
  action: "set";
  props: Record<string, string | number | boolean>;
};

export async function generateRevisionOps(
  orgId: string,
  brandId: string,
  instruction: string,
  language: "ar" | "en",
  canvasSize: { width: number; height: number },
  objects: CanvasObjectSummary[],
): Promise<{ ops: EditOp[]; provider: string }> {
  return authedPost("/creative/revise", {
    orgId,
    brandId,
    instruction,
    language,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    objects,
  });
}

export interface BackgroundImageResult {
  available: boolean;
  base64?: string;
  mimeType?: string;
  provider?: string;
  reason?: string;
}

export async function generateBackgroundImage(
  orgId: string,
  brandId: string,
  prompt: string,
): Promise<BackgroundImageResult> {
  return authedPost("/creative/image", { orgId, brandId, prompt });
}

// Real image generation via Cloudflare Workers AI (flux-1-schnell) — same account the Worker
// already runs on, no new signup, no card: verified free tier (10k Neurons/day), explicit
// no-training clause, commercial use allowed (see docs/07-cloudflare-worker-setup.md §6).
// Not wired to any other image provider: Pollinations.ai was researched as a possible fallback
// but its commercial-use/training terms could not be verified from its own ToS pages, so it is
// deliberately left out of a product that generates customer ad creative — see that doc section
// for the full research trail. When this isn't configured or the call fails, callers fall back to
// a solid/gradient background (src/lib/creative/background.ts on the client) rather than faking a
// generated image.

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
  provider: "cloudflare-workers-ai";
}

export class ImageProviderUnavailableError extends Error {}

interface CloudflareAIImageResponse {
  success: boolean;
  errors?: { message: string }[];
  result?: { image?: string };
}

export async function generateBackgroundImage(
  env: { CF_ACCOUNT_ID: string; CF_API_TOKEN: string },
  prompt: string,
): Promise<ImageGenerationResult> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    throw new ImageProviderUnavailableError(
      "Cloudflare Workers AI is not configured (CF_ACCOUNT_ID / CF_API_TOKEN).",
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, steps: 6 }),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Workers AI image request failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as CloudflareAIImageResponse;
  if (!data.success || !data.result?.image) {
    throw new Error(
      `Workers AI image request unsuccessful: ${data.errors?.map((e) => e.message).join("; ") ?? "no image in response"}`,
    );
  }

  return {
    base64: data.result.image,
    mimeType: "image/jpeg",
    provider: "cloudflare-workers-ai",
  };
}

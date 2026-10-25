import { getFirebaseAuth } from "@/lib/firebase/client";

export interface PublishToInstagramInput {
  orgId: string;
  brandId: string;
  contentItemId: string;
  imageUrl: string;
  caption: string;
}

export interface PublishToInstagramOutput {
  mediaId: string;
  permalink: string;
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

export async function publishToInstagram(
  input: PublishToInstagramInput,
): Promise<PublishToInstagramOutput> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Sign in required.");
  }
  const idToken = await user.getIdToken();

  const res = await fetch(`${requiredGatewayUrl()}/publish/instagram`, {
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
      body.message ?? body.error ?? `Publish failed (${res.status}).`,
    );
  }

  return (await res.json()) as PublishToInstagramOutput;
}

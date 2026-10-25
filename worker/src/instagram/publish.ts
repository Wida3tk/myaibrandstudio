// Instagram's content-publishing flow, verified against Meta's own docs
// (developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
// content-publishing, checked 2026-10-25): create a media container, poll it until Meta finishes
// processing, then publish the container. No Facebook Page required (Instagram Login path).

export class InstagramPublishError extends Error {}

export interface InstagramConfig {
  accessToken: string;
  igUserId: string;
  apiVersion?: string;
  /** Test hooks — production uses the defaults below. */
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export interface InstagramPublishInput {
  imageUrl: string;
  caption: string;
}

export interface InstagramPublishResult {
  mediaId: string;
  permalink: string;
}

const DEFAULT_API_VERSION = "v26.0";
const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_POLL_ATTEMPTS = 6; // ~12s total — Meta's own guidance is "once per minute for up to 5 minutes" for slow cases, but a single image normally finishes in seconds.

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function waitForContainerReady(
  base: string,
  containerId: string,
  accessToken: string,
  pollIntervalMs: number,
  maxPollAttempts: number,
): Promise<void> {
  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    const res = await fetch(`${base}/${containerId}?fields=status_code`, {
      headers: authHeaders(accessToken),
    });
    if (!res.ok) {
      throw new InstagramPublishError(
        `Failed to check container status: ${res.status} ${await res.text()}`,
      );
    }
    const { status_code: statusCode } = (await res.json()) as {
      status_code: string;
    };
    if (statusCode === "FINISHED") return;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new InstagramPublishError(`Media container failed: ${statusCode}`);
    }
    if (attempt < maxPollAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
  throw new InstagramPublishError(
    "Timed out waiting for the media container to finish processing.",
  );
}

export async function publishToInstagram(
  config: InstagramConfig,
  input: InstagramPublishInput,
): Promise<InstagramPublishResult> {
  const version = config.apiVersion ?? DEFAULT_API_VERSION;
  const base = `https://graph.instagram.com/${version}`;

  const containerRes = await fetch(`${base}/${config.igUserId}/media`, {
    method: "POST",
    headers: authHeaders(config.accessToken),
    body: JSON.stringify({
      image_url: input.imageUrl,
      caption: input.caption,
    }),
  });
  if (!containerRes.ok) {
    throw new InstagramPublishError(
      `Failed to create media container: ${containerRes.status} ${await containerRes.text()}`,
    );
  }
  const { id: containerId } = (await containerRes.json()) as { id: string };

  await waitForContainerReady(
    base,
    containerId,
    config.accessToken,
    config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    config.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS,
  );

  const publishRes = await fetch(`${base}/${config.igUserId}/media_publish`, {
    method: "POST",
    headers: authHeaders(config.accessToken),
    body: JSON.stringify({ creation_id: containerId }),
  });
  if (!publishRes.ok) {
    throw new InstagramPublishError(
      `Failed to publish media: ${publishRes.status} ${await publishRes.text()}`,
    );
  }
  const { id: mediaId } = (await publishRes.json()) as { id: string };

  const permalinkRes = await fetch(`${base}/${mediaId}?fields=permalink`, {
    headers: authHeaders(config.accessToken),
  });
  if (!permalinkRes.ok) {
    // Non-fatal: the post is live, we just couldn't fetch its share link.
    return { mediaId, permalink: "" };
  }
  const { permalink } = (await permalinkRes.json()) as { permalink: string };

  return { mediaId, permalink };
}

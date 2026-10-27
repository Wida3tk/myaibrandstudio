// Client for the local development rendering service (remotion/render-server.ts) — the only
// place that can actually run Remotion's renderer + FFmpeg (see
// docs/13-video-pipeline-architecture.md for why Firebase Hosting/Cloudflare Workers can't).
// Talks to it over plain HTTP on localhost; never reachable from the deployed static site, which
// is the point — callers must check isRenderServiceAvailable() and degrade honestly, not assume
// it's there.
import type { ShortFormVideoProps } from "@video-renderer/types";

export const RENDER_SERVICE_URL =
  process.env.NEXT_PUBLIC_RENDER_SERVICE_URL ?? "http://localhost:4100";

export interface RenderJobStatus {
  status: "queued" | "bundling" | "rendering" | "extracting" | "done" | "error";
  progress: number;
  error: string | null;
  hasVideo: boolean | null;
  hasAudio: boolean | null;
}

export async function isRenderServiceAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${RENDER_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startRenderJob(
  props: ShortFormVideoProps,
): Promise<string> {
  const res = await fetch(`${RENDER_SERVICE_URL}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(props),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to start render: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { jobId: string };
  return data.jobId;
}

export async function getRenderJobStatus(
  jobId: string,
): Promise<RenderJobStatus> {
  const res = await fetch(`${RENDER_SERVICE_URL}/render/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch render status: ${res.status}`);
  }
  return (await res.json()) as RenderJobStatus;
}

export function renderJobVideoUrl(jobId: string): string {
  return `${RENDER_SERVICE_URL}/render/${jobId}/video`;
}

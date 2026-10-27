#!/usr/bin/env node
/**
 * The local development rendering service. Firebase Hosting serves a static export (no Node
 * runtime) and Cloudflare Workers can't run a headless Chromium or FFmpeg (see
 * docs/13-video-pipeline-architecture.md) — so real MP4 rendering can only happen somewhere with a
 * real Node.js runtime. This is that somewhere, for local development: a small standalone HTTP
 * server the Next.js app's Video Studio page calls directly, so a user's flow is "click Generate
 * video, watch progress, get a playable MP4" — no manual JSON export, no terminal command per
 * video. (Starting this server itself is a one-time, side-by-side dev command, same as `npm run
 * dev` — not a per-video chore.)
 *
 * Usage: npm run render-server   (listens on PORT, default 4100)
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { extractThumbnail, probeStreams } from "./ffmpeg";
import type { ShortFormVideoProps } from "./types";

const PORT = Number(process.env.PORT ?? 4100);
const OUTPUT_ROOT = path.join(__dirname, ".render-output");
fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

type JobStatus =
  "queued" | "bundling" | "rendering" | "extracting" | "done" | "error";

interface Job {
  status: JobStatus;
  progress: number;
  error: string | null;
  videoPath: string;
  thumbnailPath: string;
  hasVideo: boolean | null;
  hasAudio: boolean | null;
  createdAt: number;
}

const jobs = new Map<string, Job>();

// Bundled once and reused across every render — re-bundling per request would make each video
// take minutes longer for no reason; the bundle only changes when the Remotion source does, which
// means restarting this server after editing remotion/, same as any dev server.
let serveUrlPromise: Promise<string> | null = null;
function getServeUrl(): Promise<string> {
  if (!serveUrlPromise) {
    serveUrlPromise = bundle({ entryPoint: path.join(__dirname, "index.ts") });
  }
  return serveUrlPromise;
}

function isValidProps(value: unknown): value is ShortFormVideoProps {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    (v.language === "ar" || v.language === "en") &&
    Array.isArray(v.scenes) &&
    v.scenes.length > 0
  );
}

async function runRenderJob(jobId: string, props: ShortFormVideoProps) {
  const job = jobs.get(jobId);
  if (!job) return;
  try {
    job.status = "bundling";
    const serveUrl = await getServeUrl();

    job.status = "rendering";
    const composition = await selectComposition({
      serveUrl,
      id: "ShortFormVideo",
      inputProps: props,
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: job.videoPath,
      inputProps: props,
      onProgress: ({ progress }) => {
        job.progress = progress;
      },
    });

    job.status = "extracting";
    try {
      await extractThumbnail(job.videoPath, job.thumbnailPath);
    } catch {
      // Thumbnail is a nice-to-have for the UI; a missing one doesn't invalidate the render.
    }

    const probe = await probeStreams(job.videoPath);
    job.hasVideo = probe.hasVideo;
    job.hasAudio = probe.hasAudio;
    job.status = "done";
    job.progress = 1;
  } catch (error) {
    job.status = "error";
    job.error = error instanceof Error ? error.message : String(error);
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string,
  contentType: string,
) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: "not-found" });
    return;
  }
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : stat.size - 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    "Content-Length": stat.size,
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/render") {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      let props: unknown;
      try {
        props = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
      } catch {
        sendJson(res, 400, { error: "invalid-json" });
        return;
      }
      if (!isValidProps(props)) {
        sendJson(res, 400, { error: "invalid-props" });
        return;
      }
      const jobId = crypto.randomUUID();
      const jobDir = path.join(OUTPUT_ROOT, jobId);
      fs.mkdirSync(jobDir, { recursive: true });
      const job: Job = {
        status: "queued",
        progress: 0,
        error: null,
        videoPath: path.join(jobDir, "video.mp4"),
        thumbnailPath: path.join(jobDir, "thumbnail.jpg"),
        hasVideo: null,
        hasAudio: null,
        createdAt: Date.now(),
      };
      jobs.set(jobId, job);
      void runRenderJob(jobId, props);
      sendJson(res, 202, { jobId });
    });
    return;
  }

  const jobMatch = /^\/render\/([^/]+)(\/(video|thumbnail))?$/.exec(
    url.pathname,
  );
  if (req.method === "GET" && jobMatch) {
    const [, jobId, , asset] = jobMatch;
    const job = jobs.get(jobId);
    if (!job) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    if (asset === "video") {
      if (job.status !== "done") {
        sendJson(res, 409, { error: "not-ready", status: job.status });
        return;
      }
      sendFile(req, res, job.videoPath, "video/mp4");
      return;
    }
    if (asset === "thumbnail") {
      sendFile(req, res, job.thumbnailPath, "image/jpeg");
      return;
    }
    sendJson(res, 200, {
      status: job.status,
      progress: job.progress,
      error: job.error,
      hasVideo: job.hasVideo,
      hasAudio: job.hasAudio,
    });
    return;
  }

  sendJson(res, 404, { error: "not-found" });
});

server.listen(PORT, () => {
  console.log(`Local render service listening on http://localhost:${PORT}`);
  console.log("Bundling the Remotion project upfront...");
  getServeUrl()
    .then(() => console.log("Bundle ready — renders will start immediately."))
    .catch((error) => console.error("Initial bundle failed:", error));
});

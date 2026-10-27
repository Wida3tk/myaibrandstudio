/** Shared by render.ts (CLI) and render-server.ts (local HTTP render service) — finds a real
 * FFmpeg binary to extract a poster-frame thumbnail from a rendered MP4. Prefers PATH (what a
 * real deployment/CI should have configured); falls back to the known winget install location
 * for this specific dev machine only. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";

const execFileAsync = promisify(execFile);

export async function findFFmpeg(): Promise<string> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return "ffmpeg";
  } catch {
    const winget = path.join(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft",
      "WinGet",
      "Packages",
    );
    if (fs.existsSync(winget)) {
      const pkg = fs
        .readdirSync(winget)
        .find((d) => d.toLowerCase().includes("ffmpeg"));
      if (pkg) {
        const bin = fs
          .readdirSync(path.join(winget, pkg))
          .find((d) => d.toLowerCase().includes("full_build"));
        if (bin) {
          const exe = path.join(winget, pkg, bin, "bin", "ffmpeg.exe");
          if (fs.existsSync(exe)) return exe;
        }
      }
    }
    throw new Error(
      "ffmpeg not found on PATH. Install it (see docs/13-video-pipeline-architecture.md) and make sure it's on PATH for new processes.",
    );
  }
}

export async function extractThumbnail(
  videoPath: string,
  thumbnailPath: string,
): Promise<void> {
  const ffmpeg = await findFFmpeg();
  await execFileAsync(ffmpeg, [
    "-y",
    "-ss",
    "0.5",
    "-i",
    videoPath,
    "-frames:v",
    "1",
    thumbnailPath,
  ]);
}

/** Probes a rendered file for real video/audio streams via ffprobe (bundled with the same FFmpeg
 * install) — used to verify a render actually contains both, not just a plausible-looking MP4. */
export async function probeStreams(
  videoPath: string,
): Promise<{ hasVideo: boolean; hasAudio: boolean; raw: string }> {
  const ffmpeg = await findFFmpeg();
  const ffprobe =
    ffmpeg === "ffmpeg"
      ? "ffprobe"
      : ffmpeg.replace(/ffmpeg\.exe$/i, "ffprobe.exe");
  const { stdout } = await execFileAsync(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,codec_name",
    "-of",
    "json",
    videoPath,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: { codec_type: string }[];
  };
  const streams = parsed.streams ?? [];
  return {
    hasVideo: streams.some((s) => s.codec_type === "video"),
    hasAudio: streams.some((s) => s.codec_type === "audio"),
    raw: stdout,
  };
}

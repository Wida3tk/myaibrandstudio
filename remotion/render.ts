#!/usr/bin/env node
/**
 * The actual "rendering" leg of the video pipeline — genuinely separate from the Next.js app and
 * the Cloudflare Worker (see docs/14-video-pipeline-setup.md for why: rendering needs a headless
 * Chromium + real compute time, which neither Cloudflare Workers nor Firebase Hosting's static
 * export can run). Takes a ShortFormVideoProps JSON file (produced by the app from
 * /video/script + /creative/image + /video/voiceover) and renders a real MP4 via Remotion's
 * programmatic API (not the CLI subprocess — on Windows, shelling out to `npx remotion` with a
 * project path containing spaces mis-splits the arguments; the bundler/renderer functions avoid
 * that entirely), then extracts a poster-frame thumbnail via the system FFmpeg install.
 *
 * Usage: npm run render-video -- <props.json> [output.mp4]
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import type { ShortFormVideoProps } from "./types";

const execFileAsync = promisify(execFile);

async function findFFmpeg(): Promise<string> {
  // Prefer PATH (what a real deployment/CI should have configured) — only fall back to the
  // known winget install location for this specific dev machine.
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
      "ffmpeg not found on PATH. Install it (see docs/14-video-pipeline-setup.md) and make sure it's on PATH for new processes.",
    );
  }
}

async function main() {
  const [, , propsPath, outputArg] = process.argv;
  if (!propsPath) {
    console.error("Usage: npm run render-video -- <props.json> [output.mp4]");
    process.exit(1);
  }
  if (!fs.existsSync(propsPath)) {
    console.error(`Props file not found: ${propsPath}`);
    process.exit(1);
  }

  const props = JSON.parse(
    fs.readFileSync(propsPath, "utf-8"),
  ) as ShortFormVideoProps;
  const outputPath = path.resolve(outputArg ?? "out/video.mp4");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  console.log("Bundling the Remotion project...");
  const serveUrl = await bundle({
    entryPoint: path.join(__dirname, "index.ts"),
  });

  console.log("Selecting the composition...");
  const composition = await selectComposition({
    serveUrl,
    id: "ShortFormVideo",
    inputProps: props,
  });

  console.log("Rendering...");
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: props,
    onProgress: ({ progress }) => {
      process.stdout.write(`\rRendering: ${Math.round(progress * 100)}%`);
    },
  });
  console.log(`\nRendered: ${outputPath}`);

  try {
    const ffmpeg = await findFFmpeg();
    const thumbnailPath = outputPath.replace(/\.mp4$/, "-thumbnail.jpg");
    await execFileAsync(ffmpeg, [
      "-y",
      "-ss",
      "0.5",
      "-i",
      outputPath,
      "-frames:v",
      "1",
      thumbnailPath,
    ]);
    console.log(`Thumbnail: ${thumbnailPath}`);
  } catch (error) {
    console.warn(
      `Rendered the video but could not extract a thumbnail via FFmpeg: ${String(error)}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * The actual "rendering" leg of the video pipeline — genuinely separate from the Next.js app and
 * the Cloudflare Worker (see docs/13-video-pipeline-architecture.md for why: rendering needs a headless
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
import path from "node:path";
import fs from "node:fs";
import type { ShortFormVideoProps } from "./types";
import { extractThumbnail } from "./ffmpeg";

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
    const thumbnailPath = outputPath.replace(/\.mp4$/, "-thumbnail.jpg");
    await extractThumbnail(outputPath, thumbnailPath);
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

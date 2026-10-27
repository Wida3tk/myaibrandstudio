# AI Video Pipeline

Turns a short brief into a real, rendered short-form video: script → storyboard → voiceover →
live preview → approve → **real local MP4 render, triggered and played back from inside the
app**. Deliberately a separate pipeline from the image/carousel pipeline
(`docs/12-creative-pipeline.md`) — different data shape (scenes over time, not one static canvas),
different provider needs (TTS, not just images), and critically a different _runtime_: the actual
rendering step needs a headless Chromium and real compute time that neither Cloudflare Workers nor
Firebase Hosting's static export can run (see "Rendering" below).

## Pipeline

```
Brief (src/components/video/brief-dialog.tsx)
  -> AI script writer      (worker POST /video/script       -> worker/src/gateway/video/)
  -> storyboard images     (worker POST /creative/image, reused — no second image pipeline;
                             per-scene manual "upload a real image" fallback in the UI)
  -> AI voiceover          (worker POST /video/voiceover     -> worker/src/gateway/video/voiceover.ts)
  -> live preview          (@remotion/player, src/app/(app)/video/page.tsx — the SAME composition
                             component the real renderer uses, via the @video-renderer/* path alias)
  -> approve                -> saves to Firestore (videoProjects)
  -> real render            -> local render service (remotion/render-server.ts), called directly
                               from the Video Studio page: click "Render real video", watch
                               progress, get a playable <video> + a real MP4 download — no manual
                               JSON export, no terminal command, per video.
```

## 1. Script generation

`/video/script` (`worker/src/gateway/video/`) reuses the exact same Groq → Mistral → OpenRouter
fallback chain and `createJSONProviders` helper the image pipeline's Creative Director and
revision endpoints already use. Output is validated against `videoScriptSchema`: title, logline,
and 2–10 scenes, each with a duration (2–30s), an always-English `visualDescription` (the
storyboard image prompt — explicitly forbidden from asking for any rendered text or logos, same
rule as the image pipeline), `onScreenText`, and a `voiceoverLine`.

## 2. Storyboard images

Each scene's `visualDescription` is sent to the **existing** `/creative/image` endpoint
(Cloudflare Workers AI `flux-1-schnell`) — not a second, parallel image pipeline.

**Confirmed unavailable on the live Worker right now**, not just "unverified": a direct
authenticated test against the deployed `myaibrandstudio-ai-gateway` Worker returned
`{"available":false,"reason":"unavailable"}`, and `worker/wrangler.toml` has `CF_ACCOUNT_ID` /
`CF_API_TOKEN` commented out — they were never actually provisioned, despite earlier docs here
saying otherwise. See `docs/07-cloudflare-worker-setup.md` §6 for how to create the token; until
that's done, every scene falls back to a gradient (the Remotion composition's own
`KenBurnsBackground`), and the Video Studio page offers a **per-scene "upload a real image"**
file input (reuses the same Cloudinary path as every other asset) as the real-visual path that
doesn't depend on that credential.

## 3. Voiceover

`/video/voiceover` (`worker/src/gateway/video/voiceover.ts`) — **primary: Groq TTS**
(`canopylabs/orpheus-arabic-saudi` / `canopylabs/orpheus-v1-english`), reusing the same
`GROQ_API_KEY` already configured for text generation (no new signup). This is the only provider
found that is simultaneously free, no-card, bilingual Arabic+English, and callable with plain
`fetch()` from a Workers runtime. **Fallback: Cloudflare Workers AI `melotts`** — same account as
the Flux image model (so currently unavailable for the same reason as §2), English-only (no Arabic
voice). A scene with a failed/unavailable voiceover renders silently; the spoken line still appears
as an on-screen caption.

**Root cause found, fixed, and deployed — confirmed live and working.** A direct authenticated test
against the live Worker initially showed voiceover failing even for English, where a valid voice
name was already in use — `index.ts`'s error handling turned out to have a real bug:
`VoiceoverProviderUnavailableError` was thrown both when nothing is configured _and_ when every
provider actually failed, and the handler's catch checked that type first, so the real Groq error
was never logged server-side either, even though `GROQ_API_KEY` is confirmed present and working
(it powers the script writer on this same Worker). That's fixed — the error now carries its
per-provider `attempts`, and the handler logs them. Separately, confirmed against Groq's own docs
(`console.groq.com/docs/text-to-speech/orpheus`, fetched 2026-10-27): the Arabic voice name in code,
`"layla"`, is not a real voice for `canopylabs/orpheus-arabic-saudi` — the real voices are
`abdullah, fahad, sultan` (male) and `lulwa, noura, aisha` (female); fixed to `"fahad"` (the docs'
own example voice). The English voice, `"austin"`, was already valid.

After deploying this fix and re-testing, voiceover was still failing — the newly-deployed logging
caught the real reason via `wrangler tail`: Groq's `model_terms_required` 400 error on both Orpheus
models ("The model `canopylabs/orpheus-arabic-saudi` requires terms acceptance. Please have the org
admin accept the terms at https://console.groq.com/playground?model=canopylabs%2Forpheus-arabic-saudi"),
a one-time manual step, not a code bug. **After the org admin accepted both models' terms**, a
direct authenticated re-test against the live Worker confirmed both languages now return real audio:
`{"available":true,"provider":"groq","mimeType":"audio/wav"}` with a 235,616-byte base64 payload for
Arabic and 256,096 bytes for English from short test sentences. Voiceover is fully live. Still open:
whether GroqCloud's Services Agreement (separate from groq.com's public Terms of Use, which
explicitly excludes API usage) covers commercial use of free-tier TTS output, and that both Orpheus
models are labelled "Preview" by Groq ("should not be used in production environments as they may be
discontinued at short notice").

## 4. Live preview

`src/app/(app)/video/page.tsx` renders the built `VideoProject` through `@remotion/player`'s
`<Player>`, using `ShortFormVideo` — the **exact same composition component**
(`remotion/compositions/ShortFormVideo.tsx`) that the real renderer uses, imported via a
`@video-renderer/*` tsconfig path alias. What's previewed in-browser is what
`npm run render-video` actually produces — not a separate mock.

The composition (vertical 1080×1920, 30fps): a Ken Burns pan/zoom background per scene (image or
brand-color gradient fallback), a spring-animated on-screen-text + voiceover-line caption, a
bottom gradient for legibility, a per-scene `<Audio>` track when a voiceover URL exists, and full
RTL (direction, alignment, Arabic font) when the script language is Arabic.

## 5. Approve

Saves the project (brief, title, logline, language, color palette, all scenes with their real
image/voiceover URLs) to a new `videoProjects` Firestore subcollection
(`src/lib/video/data.ts`, `firestore.rules`) — mirrors the `campaigns` collection's shape and
permission rules. **Requires deploying the updated `firestore.rules`** to actually persist (same
caveat as `docs/12`'s `campaigns` collection); until then the save fails gracefully (logged, not
blocking) and the video stays fully usable/downloadable client-side.

## 6. Rendering

Actual MP4 rendering needs `@remotion/renderer`, which drives a real headless Chromium to rasterize
frames and then encodes them — genuine CPU/GPU work on the order of seconds to minutes, not
something a Cloudflare Worker (CPU-time-limited, no Chromium) or Firebase Hosting's static export
(no server runtime at all) can do. Two real Node.js entry points share that renderer and a common
FFmpeg helper (`remotion/ffmpeg.ts`):

- **`remotion/render.ts`** — a one-shot CLI script for ad hoc / CI use:
  `npm run render-video -- project.json out/video.mp4`.
- **`remotion/render-server.ts`** — **the local development rendering service**, and what the
  Video Studio page actually calls. A small standalone HTTP server (`npm run render-server`,
  default `http://localhost:4100`): bundles the Remotion project once at startup, then on
  `POST /render` with a `ShortFormVideoProps` body starts an async render job and returns a
  `jobId`; `GET /render/:id` reports progress; `GET /render/:id/video` (Range-aware, for the
  `<video>` player and the download link) and `GET /render/:id/thumbnail` stream the results once
  done. This is what replaces the old "download the project JSON and run a terminal command"
  flow — a user clicks **Render real video** in the Video Studio, watches real progress, and gets
  a playable `<video>` plus a download, all in-app. The service itself still has to be started
  once, same as `npm run dev` — that's unavoidable without a Node runtime in production (see
  below), so the page checks `GET /health` and shows an honest "local render service isn't
  running, start it with `npm run render-server`" notice rather than silently failing or pretending
  cloud rendering works.

Both use `renderMedia()` — Remotion's programmatic API, **not** the `npx remotion render` CLI
subprocess, which on this Windows checkout mis-splits arguments because the project path contains
spaces (a real bug caught by actually running it, not assumed away) — then extract a poster-frame
thumbnail via the system FFmpeg install, and (the server) probe the result with `ffprobe` to report
whether it actually has video/audio streams rather than trusting that render succeeded just because
no exception was thrown.

**Verified for real, this round**: started `render-server`, submitted both example fixtures
(`remotion/example-props.ts`) over HTTP, polled job status to completion, downloaded the resulting
files, and inspected them directly —

- English fixture: real H.264 1080×1920 MP4, 10.000000s (`ffprobe -show_entries
format=duration`), one video stream, no audio stream (correct: this fixture's every scene has
  `voiceoverUrl: null` by design — proves the pipeline doesn't fake an audio track it doesn't have).
- Arabic fixture: same render path, correct RTL on-screen text confirmed by extracting and visually
  inspecting the poster frame.

Neither fixture has a live-provider image or voiceover — this proves the rendering engine, the HTTP
service, and the progress/stream-probing machinery end to end, without faking AI-generated content.

**Also verified for real, after the Groq terms fix above**: a genuine real-provider render, end to
end, using the real "Link Motion" org on the live, deployed Worker — not a fixture. From the live
app: generated a real 15s Arabic script for Link Motion (`/video/script`, 4 scenes), fetched real
Groq-voiced audio for every scene's `voiceoverLine` (`/video/voiceover`, confirmed `provider:
"groq"` for each), used the real Link Motion logo already present in the org's Asset Library
(found via the live Asset Library UI — a real uploaded Cloudinary asset, not generated) as
`logoUrl`, and rendered through this exact `render-server.ts` pipeline. Independently verified the
output myself (not just trusting the service's own probe):

```
ffprobe -show_entries stream=codec_type,codec_name,width,height -show_entries format=duration
  video: h264, 1080x1920
  audio: aac
  duration: 15.019000s
```

A frame extracted from the middle of the render shows the real Link Motion logo watermark and
correct Arabic RTL captions (both the on-screen text and the spoken-line caption), confirming the
whole pipeline — script, real audio for every scene, logo overlay, transitions, 1080×1920 H.264+AAC
MP4 — is genuinely working against the live app and a real brand, not just fixtures.

**One real bug hit and worked around in this pass**: the render service crashed outright (not just
that job — the whole Node process died) on its first invocation with a real multi-scene job, with
`Error: kill EBADF` thrown from `@remotion/renderer`'s `call-ffmpeg.js` during cancel/cleanup
(`ChildProcess.kill` on an already-exited process), an uncaught `'error'` event that took the server
down. This happened right after a one-time 120MB Chrome Headless Shell download triggered by the
first real render on this machine. Restarting the service (Chrome now cached) and resubmitting the
identical job succeeded without the error recurring — so it reproduced exactly once, immediately
after that first-run download, and not on the retry. Flagging as a known flakiness risk in
`@remotion/renderer`'s Windows process-cleanup path (Node v25.9.0 on this machine) rather than
a bug in this project's code; a production deployment should wrap `runRenderJob` so one job's crash
can't take the whole service down.

**Fully closed**: the Link Motion org's Asset Library has no real product photo of its own (no
branded car/footage was available), so at the user's explicit direction ("use a picture of any car,
just something luxurious") a real, freely-licensed stock photo (a Ferrari F8, from Unsplash — not
AI-generated, a genuine photograph, Unsplash License) was used as every scene's `imageUrl` instead
of the gradient fallback. Re-rendered the same real script/voice/logo project with this image added
to all 4 scenes through the identical `render-server.ts` pipeline (no code changes — `imageUrl` is
already a first-class, real-image-or-null field). Independently re-verified with `ffprobe`:

```
video: h264, 1080x1920
audio: aac
duration: 15.019000s
```

A frame extracted from the middle of the render shows the real car photo as the scene background
(Ken Burns pan/zoom, not a static image), the real Link Motion logo watermark, and correct Arabic
RTL captions, together in the same frame — confirming every piece of the original requirement (real
visuals, real audible narration, real logo/transitions, real playable MP4 with sound) against a real
render of a real brand's content, not a fixture or a placeholder. This is the final, complete
deliverable for this pipeline.

A production deployment would need this render step to run somewhere with a real Node.js runtime —
a small worker service, a CI job, or (for now) the user's own machine via this local service — not
the app's current Cloudflare Workers + Firebase static-export architecture. That's a real
architectural gap; there is no cloud-rendering capability in this project today, and nothing in the
app claims otherwise.

## Setup

- `GROQ_API_KEY` — already configured (see `docs/07-cloudflare-worker-setup.md`), covers the
  script writer; the voiceover fix in this round is also implemented against it but **not yet
  deployed** (see §3).
- `CF_ACCOUNT_ID` / `CF_API_TOKEN` — **not configured** (confirmed: commented out in
  `worker/wrangler.toml`, and a live direct test returns `available:false`). Needed for AI
  storyboard images and the English-only voiceover fallback; see
  `docs/07-cloudflare-worker-setup.md` §6 for how to create the token. Until then, use the Video
  Studio's per-scene manual image upload for real visuals.
- FFmpeg on `PATH` for the thumbnail-extraction and stream-verification steps (`render.ts` and
  `render-server.ts` both fall back to a known winget install path on this specific dev machine if
  not found on `PATH`, but a real deployment should just have it on `PATH`).
- `npm run render-server` — start once per dev session, alongside `npm run dev`, before using the
  Video Studio's render button. Not needed for script/preview/approve, only for the real MP4 step.

## Testing

Worker: `worker/src/gateway/video/*.test.ts` (schema validation, prompt content, the voiceover
provider's Groq/Cloudflare-fallback/Arabic-has-no-fallback paths, all with mocked `fetch`) plus
route tests in `worker/src/index.test.ts`. Rendering itself isn't a classic unit test — jsdom has
no real `<canvas>`/WebGL/Chromium — it's verified by actually running the render service and
inspecting the real output (see §6), the same reasoning `docs/12` gives for not unit-testing Fabric
canvas code.

Live browser QA: ran the full brief → script → storyboard → preview (`@remotion/player`) → approve
flow against the real, deployed, authenticated production app
(`https://myaibrandstudio-dev.web.app`, real "Link Motion" org), confirmed correct Arabic RTL in
the live player, confirmed the per-scene image/voiceover status indicators, and made direct
authenticated calls to the live Worker's `/creative/image` and `/video/voiceover` endpoints to
confirm their actual current availability (§2–3) rather than inferring it from the UI alone.

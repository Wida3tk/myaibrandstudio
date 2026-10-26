# AI Video Pipeline

Turns a short brief into a real, rendered short-form video: script → storyboard → voiceover →
live preview → approve → render. Deliberately a separate pipeline from the image/carousel
pipeline (`docs/12-creative-pipeline.md`) — different data shape (scenes over time, not one
static canvas), different provider needs (TTS, not just images), and critically a different
_runtime_: the actual rendering step needs a headless Chromium and real compute time that neither
Cloudflare Workers nor Firebase Hosting's static export can run (see "Why rendering is separate"
below).

## Pipeline

```
Brief (src/components/video/brief-dialog.tsx)
  -> AI script writer      (worker POST /video/script       -> worker/src/gateway/video/)
  -> storyboard images     (worker POST /creative/image, reused — no second image pipeline)
  -> AI voiceover          (worker POST /video/voiceover     -> worker/src/gateway/video/voiceover.ts)
  -> live preview          (@remotion/player, src/app/(app)/video/page.tsx — the SAME composition
                             component the real renderer uses, via the @video-renderer/* path alias)
  -> approve                -> saves to Firestore (videoProjects) + downloadable project JSON
  -> real render (separate step, see below) -> npm run render-video -- project.json out.mp4
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
(Cloudflare Workers AI `flux-1-schnell`) — not a second, parallel image pipeline. Same caveat as
`docs/12`: not verified against a live account from this sandbox (no provider credentials), falls
back to a gradient per scene (the Remotion composition's own `KenBurnsBackground`) when
unconfigured or the call fails.

## 3. Voiceover

`/video/voiceover` (`worker/src/gateway/video/voiceover.ts`) — **primary: Groq TTS**
(`canopylabs/orpheus-arabic-saudi` / `canopylabs/orpheus-v1-english`), reusing the same
`GROQ_API_KEY` already configured for text generation (no new signup). Research found this is the
only provider that is simultaneously free, no-card, bilingual Arabic+English, and callable with
plain `fetch()` from a Workers runtime. **Fallback: Cloudflare Workers AI `melotts`** — same
account as the Flux image model, English-only (no Arabic voice). A scene with a failed/unavailable
voiceover renders silently; the spoken line still appears as an on-screen caption.

**Not verified live** — implemented against each provider's documented shape, two things need
human confirmation before production use: the exact Groq voice names for these specific models
(undocumented in the research pass; `layla`/`austin` in the code are placeholders), and whether
GroqCloud's Services Agreement (separate from groq.com's public Terms of Use, which explicitly
excludes API usage) covers commercial use of free-tier TTS output.

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

## 6. Rendering — why it's a separate step

Actual MP4 rendering needs `@remotion/renderer`, which drives a real headless Chromium to rasterize
frames and then encodes them — genuine CPU/GPU work on the order of seconds to minutes, not
something a Cloudflare Worker (CPU-time-limited, no Chromium) or Firebase Hosting's static export
(no server runtime at all) can do. So `remotion/render.ts` is a **Node.js script**, not a Worker
endpoint or a browser action:

```bash
npm run render-video -- project.json out/video.mp4
```

It bundles the Remotion project, selects the `ShortFormVideo` composition, renders it via
`renderMedia()` (Remotion's programmatic API — **not** the `npx remotion render` CLI subprocess,
which on this Windows checkout mis-splits arguments because the project path contains spaces; a
real bug caught by actually running it, not assumed away), then extracts a poster-frame thumbnail
via the system FFmpeg install (`ffmpeg -ss 0.5 -i out.mp4 -frames:v 1 out-thumbnail.jpg`).

**Verified for real**: rendered actual 1080×1920 H.264 MP4s in both English and Arabic from the
example fixtures (`remotion/example-props.ts`) — 10 seconds each, correct resolution and duration
confirmed via `ffprobe`, correct Arabic RTL text rendering confirmed by extracting and visually
inspecting a frame. Both fixtures use `imageUrl: null` / `voiceoverUrl: null` (no live provider
credentials in this sandbox) — this proves the rendering engine itself end to end without faking
AI-generated storyboard or voiceover content.

A production deployment would run this render step somewhere with a real Node.js runtime — a
small worker service, a CI job, or the user's own machine — not the app's current Cloudflare
Workers + Firebase static-export architecture. That's a real architectural gap, documented here
rather than hidden behind a UI that implies rendering "just works" in the browser.

## Setup

- `GROQ_API_KEY` — already configured (see `docs/07-cloudflare-worker-setup.md`), covers the
  script writer and the primary voiceover provider.
- `CF_ACCOUNT_ID` / `CF_API_TOKEN` — already configured for the image pipeline's background
  generation (`docs/07-cloudflare-worker-setup.md` §6), also covers storyboard images and the
  English-only voiceover fallback.
- FFmpeg on `PATH` for the thumbnail-extraction step (`npm run render-video` falls back to a
  known winget install path on this specific dev machine if not found on `PATH`, but a real
  deployment should just have it on `PATH`).
- No new secrets needed beyond what the image pipeline already requires.

## Testing

Worker: `worker/src/gateway/video/*.test.ts` (schema validation, prompt content, the voiceover
provider's Groq/Cloudflare-fallback/Arabic-has-no-fallback paths, all with mocked `fetch`) plus
route tests in `worker/src/index.test.ts`. Rendering itself isn't a classic unit test — jsdom has
no real `<canvas>`/WebGL/Chromium — it's verified by actually running `render-video` and inspecting
the real output (see above), the same reasoning `docs/12` gives for not unit-testing Fabric canvas
code.

Live browser QA: ran the full brief → script (stubbed) → storyboard (real Cloudinary upload) →
preview (`@remotion/player`, real rendering) → approve flow in both languages against the real
Cloudinary account, confirmed correct Arabic RTL in the live player, confirmed the per-scene
image/voiceover status indicators, confirmed graceful degradation when Firestore rules aren't
deployed (same as `docs/12`).

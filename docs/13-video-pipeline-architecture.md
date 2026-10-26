# Future: AI video pipeline (architecture sketch — not implemented)

Groundwork only, per the creative-pipeline task's explicit scope: a sketch of where AI video would
live, kept structurally separate from the shipped image/text creative pipeline
(`docs/12-creative-pipeline.md`) so video work can be built later without threading through, or
risking, what's already shipped. **No script generation, no storyboard rendering, no voiceover, no
subtitles, and no video generation actually work today.** The only thing that exists is
`src/lib/video/types.ts` — plain TypeScript interfaces, no runtime logic, no Worker endpoint, no
Firestore collection, no UI.

## Why separate from `src/lib/creative/`

- A video provider is a different integration surface (likely a job-queue API — submit, poll,
  download — not a synchronous request/response like the text/image gateway), with its own
  pricing, free-tier terms and privacy review, same as the image provider needed its own research
  (`docs/07-cloudflare-worker-setup.md` §6).
- Scenes/storyboard/voiceover/subtitles are a genuinely different data shape from a single static
  design (`DesignVariation`) — forcing them into the same types would make both pipelines worse.
- If a video provider later requires a paid plan (likely — free tiers for video generation are
  rare and thin), that decision must stay isolated and explicit, never silently inherited by the
  image pipeline's "it's all free-tier" posture.

## Sketched pipeline (mirrors the image pipeline's shape)

```
Brief (VideoScriptBrief)
  -> AI script generation       (would reuse the existing Groq/Mistral/OpenRouter text gateway —
                                  same createJSONProviders helper the creative-director and
                                  revision endpoints already share, worker/src/gateway/providers/json-fallback.ts)
  -> Storyboard frames           (one still image per scene — would reuse the EXISTING image
                                  gateway, worker POST /creative/image, not a second image provider)
  -> Voiceover                   (needs a real TTS provider decision — not researched; most free
                                  tiers are low-quality or rate-limited, verify before building)
  -> Subtitles                   (derivable from the script text + scene timings without an extra
                                  AI call, once scenes have real durations)
  -> Video assembly/generation   (the actual video-generation or video-assembly step — needs a real
                                  provider decision, likely the first part of this pipeline that
                                  costs real money; do not build or activate without the user's
                                  explicit approval, per the root task's engineering rules)
```

## What would need to exist before this is real

1. A provider research pass for script/storyboard generation reuse (already covered — same text
   gateway) and a **separate, explicit** research pass for TTS (voiceover) and video
   generation/assembly, using the `free-llm-api-advisor` skill the same way the image-gateway
   decision was made (see `docs/12-creative-pipeline.md` §3) — verify free-tier limits, commercial
   terms, and privacy/training terms against each provider's own current docs before integrating.
2. `worker/src/gateway/video/` (schema, prompt, providers) mirroring `worker/src/gateway/creative/`.
3. A `videoProjects` Firestore subcollection + `firestore.rules` entry, mirroring `campaigns`.
4. A UI entry point — likely its own page rather than bolted onto the Design Studio, since editing
   a timeline/storyboard is a different interaction model than editing a single static canvas.

None of the above is built. This doc and `src/lib/video/types.ts` exist so the eventual
implementation has a documented shape to build against, not because any part of it works.

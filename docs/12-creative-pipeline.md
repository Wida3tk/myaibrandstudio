# Autonomous AI Creative Pipeline

Turns the Design Studio from a manual Fabric.js editor into an autonomous production system: the
user enters one short brief, the AI handles strategy, copywriting, imagery and layout, and three
genuinely different finished designs come back for approval. Manual editing (everything that
shipped in `docs/11-premium-ui-overhaul.md`'s M3) stays fully intact and becomes optional — nothing
in the existing Design Studio toolbar, layers panel, or text-properties panel was removed.

## Pipeline

```
Brief (src/components/creative/brief-dialog.tsx)
  -> AI Creative Director  (worker POST /creative/brief  -> worker/src/gateway/creative/)
  -> AI background image   (worker POST /creative/image  -> Cloudflare Workers AI, or a gradient fallback)
  -> Automatic layout composer (src/lib/design/compose.ts, pure functions, unit-tested)
  -> 3 variations rendered off-screen (src/lib/creative/pipeline.ts, fabric.StaticCanvas)
  -> Variation picker (src/components/creative/variation-picker.tsx) -> approve one
  -> Loads into the existing interactive Fabric canvas — manual edit, AI-revise, or export from there
```

## 1–2. Brief + Creative Director

`BriefDialog` pre-fills audience/style defaults from the Brand Hub profile (`useOrg().brand`) and
collects objective, platform, copy language, visual style, optional audience override, required
text and custom instructions. The Worker's `/creative/brief` endpoint
(`worker/src/gateway/creative/schema.ts`, `prompt.ts`, `providers.ts`) reuses the exact same
Groq → Mistral → OpenRouter fallback chain the text-content gateway already had — generalized via
`worker/src/gateway/providers/json-fallback.ts` (`createJSONProviders`) instead of duplicated a
second time — and validates the model's JSON output against a strict zod schema
(`creativeSpecSchema`): campaign concept, headline, supporting copy, CTA, visual direction, a
2–6-color palette, 1–3 English image prompts, a free-text layout composition direction, a
typography-hierarchy hint, platform dimensions (server-overridden with the request's own width/
height — never trusted from the model), and brand constraints. The prompt explicitly forbids image
prompts from requesting any rendered text, numbers or logos — see §4.

## 3. Image generation

`worker/src/gateway/creative/image.ts` calls Cloudflare Workers AI's `@cf/black-forest-labs/
flux-1-schnell` — same Cloudflare account the Worker already runs on, no new signup. Verified free
tier (10k Neurons/day, no card, explicit no-training clause, commercial use allowed under the
model's own license) — see `docs/07-cloudflare-worker-setup.md` §6 for the full research trail and
setup steps (`CF_ACCOUNT_ID` + `CF_API_TOKEN`). **Not yet verified against a live account**: this
sandbox had no Cloudflare credentials to actually call it, so the image-generation leg is
implemented and unit-tested (mocked HTTP) but unconfirmed to produce a real image end to end —
confirm with real credentials before relying on it. When unconfigured or the call fails,
`/creative/image` returns `{available: false}` (200, not an error) and the composer falls back to
a brand-colored gradient instead of a broken or fake image.

## 4–5. Automatic layout composer + 3 variations

`src/lib/design/compose.ts` is a pure, fully unit-tested (`compose.test.ts`) function per layout
variant — **editorial** (full-bleed photo, bottom-third copy, serif-leaning), **bold** (image top +
solid color-block bottom with a pill CTA), **minimal** (small image card to one side, generous
whitespace) — each a genuinely different composition, not a palette swap. Every variant:

- Keeps headline/body/CTA as real `Textbox` objects with the AI's exact copy — never baked into
  the generated image, so Arabic spelling is never at the mercy of an image model.
- Places the brand logo (when set) via `fit: "contain"` only — uniform scaling, no crop, no
  filters, so an uploaded logo always renders exactly as uploaded.
- Flips to RTL (`direction`, `textAlign`, and for the minimal variant the whole card/text mirror)
  when the brief's language is Arabic.
- Sizes type off `Math.min(width, height)`, not width alone, so a short/wide format like a
  LinkedIn post doesn't get square-canvas-sized headlines that overflow vertically.

`src/lib/design/apply-layout.ts` turns those specs into real Fabric objects, tagging each with a
`role` (`headline`, `body`, `cta`, `logo`, `background`, ...) — the hook the AI-revision panel (§6)
and multi-format recompose (§7) use to target elements without knowing pixel coordinates.
`src/lib/creative/pipeline.ts` renders all 3 variants on off-screen `fabric.StaticCanvas`es for the
picker's thumbnails; nothing touches the interactive canvas until the user approves one.

**Fabric v7 gotcha hit during QA**: this Fabric version defaults every object's origin to its
_center_, not top-left (a breaking change from older Fabric majors) — every object `apply-layout.ts`
creates now pins `originX/originY: "left"/"top"` explicitly, or `left`/`top` silently become the
object's center point instead of its corner.

## 6. AI design revisions

`RevisePanel` sends the instruction plus a role-tagged summary of the current canvas
(`src/lib/design/revise.ts#summarizeCanvas`) to `/creative/revise`. The Worker translates it into a
small list of `{role, action: "set", props}` edits validated against a **closed, zod-`.strict()`**
prop allowlist (`worker/src/gateway/creative/revise-schema.ts`) — the model can move, resize,
recolor or retext an existing role-tagged object, but can never invent a new role, add/remove
objects, or set a property outside the allowlist. `applyEditOps` re-filters against the same
allowlist client-side (defense in depth) before applying, then calls the existing `commit()` so
undo/redo (the design page's pre-existing JSON-snapshot stack) covers AI revisions for free.

## 7. Multi-format output

Switching the Format dropdown while an AI-composed design is loaded re-runs `composeLayout` for the
new dimensions (`handleFormatChange` in the design page) instead of naively stretching the existing
objects — a real recomposition, reusing `src/lib/design/presets.ts`'s existing format list. PNG
export and Fabric's own `toJSON`/`loadFromJSON` (already shipped in M3) are unchanged and cover
export + reopening a saved design.

## 8. Asset management

The generated background image is uploaded **once** per campaign (not once per variation) through
the existing `uploadToCloudinary` + `createAsset` pair (`src/lib/assets/*`) — the same path manual
image uploads already use, so it shows up in the Asset Library alongside everything else with no
parallel storage path. Campaign records (brief, validated spec, background URL, all 3 variations'
Fabric JSON, the selected one) live in a new `campaigns` subcollection — see
`docs/03-data-model.md` and the `firestore.rules` entry mirroring `contentItems`'s permission
shape. **Saving a campaign record requires deploying the updated `firestore.rules`** (not done —
no deploy without approval, see root task rules); until then `createCampaign` fails gracefully
(logged, not surfaced as a blocking error) and the 3 variations stay fully usable client-side, just
without a persisted history entry.

## Testing

Worker: `worker/src/gateway/creative/*.test.ts` (schema validation, prompt content, the image
provider's success/failure/unconfigured paths, all with mocked `fetch`) plus new route tests in
`worker/src/index.test.ts`. Client: `src/lib/design/compose.test.ts` (every variant stays in
bounds, uses the spec's exact copy, flips RTL, produces 3 structurally distinct role sets). Fabric
canvas interactions themselves (`apply-layout.ts`, `revise.ts`) aren't unit-tested, consistent with
the rest of this codebase's existing canvas code (`layers-panel.tsx`,
`text-properties-panel.tsx`) — this sandbox's jsdom test environment has no real `<canvas>` 2D
context, so verification is via a real browser session instead (see the QA notes below).

## QA

Ran end-to-end in a real browser against the real (already-deployed) Firebase project, with
`/creative/*` Worker calls stubbed (the live deployed Worker predates this feature and wasn't
redeployed — no deploy without approval) but every other leg real: real sign-in, real Brand Hub
read, real Cloudinary upload of the generated image, real Fabric rendering, real Firestore writes
(campaigns collection write correctly fails on current rules as expected, see §8).

Found and fixed 3 real bugs this way: (1) Firestore's `addDoc` rejects `undefined` anywhere in the
payload — the brief's optional fields needed normalizing to `null`; (2) Fabric's own
`toObject()` includes several properties as literal `undefined` even when unset (a Gradient's
`gradientTransform`, a Textbox's `path`) — added `stripUndefinedDeep` before any Firestore write of
Fabric JSON; (3) the Fabric v7 center-origin default above, which was cutting off the first few
characters of every LTR headline/body/CTA before the fix.

Verified working: an Arabic Instagram-post training-course ad (RTL layout, right-aligned text,
correct Arabic rendering), an English LinkedIn leadership post (all 3 variants, logo top-right,
pill CTA), format switching from Instagram-post to LinkedIn-post recomposing rather than
stretching, an AI revision ("make the headline larger") correctly resizing only that object with
undo reverting it, and the asset library picking up the real uploaded background image.

**Not verified live**: real (non-stubbed) AI Creative Director output quality, and real Cloudflare
Workers AI image generation — both need provider credentials this sandbox doesn't have. The Worker
code for both is unit-tested against mocked HTTP responses matching the real APIs' documented
shapes, same rigor as the rest of this codebase's provider code, but "the unit tests pass" is not
the same claim as "it generates a real image" — confirm with real credentials before relying on it
for production content.

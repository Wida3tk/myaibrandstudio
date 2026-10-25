# Premium Studio UI overhaul (`feat/premium-studio-ui`)

Built autonomously across 7 milestones on top of the M0–M5 feature work (see
[docs/04-roadmap-acceptance-criteria.md](04-roadmap-acceptance-criteria.md)). Every milestone
below preserves the existing Firebase/Cloudinary/Worker integrations and data model — this is a
visual and UX rebuild, not a backend rewrite, with two small, additive exceptions noted in M2 and
M4.

## What shipped

**M1 — Design system + app shell.** New token layer in `src/app/globals.css` (warm ivory /
lavender / signature violet / deep navy / mint, light + dark via a `data-theme` attribute),
reusable primitives in `src/components/ui/*` built on Radix UI (per this doc's own
`02-design-system.md` recommendation) + lucide-react icons, a persistent collapsible sidebar,
topbar with real keyboard-accessible search (Ctrl/Cmd+K — searches nav + live content), a
quick-create dialog, and a real dashboard (`src/app/(app)/page.tsx`) replacing the placeholder
Hero, with live content counts, recent items and an onboarding state when no brand profile
exists yet.

**M2 — AI Content Studio.** Extended the Worker's `/` generate endpoint
(`worker/src/index.ts`, `worker/src/gateway/`) with optional per-generation overrides — tone,
audience, content pillars, custom instructions — layered onto the brand's stored defaults, not
replacing them. Rebuilt `content/new` into a full workspace: platform/tone/pillar controls,
editable generated fields, live platform previews, and friendly bilingual error copy for budget
and provider-failure responses instead of raw error codes.

**M3 — Design Studio.** Replaced the from-scratch `<canvas>` compositing code with a real editor
on **Fabric.js v7** (MIT, no React peer dependency). Chosen over react-konva because Fabric's
`Textbox` gives native in-canvas text editing and JSON serialize/deserialize "for free," which
covers editable text, undo/redo and PNG export with library code instead of hand-rolled logic.
Format presets, locally-defined starter templates (no stock imagery), center-snap alignment
guides, a layers panel, and Cloudinary save all working end-to-end.

**M4 — Content Library + Brand Hub.** `content` is now a searchable/filterable card-or-list
library with a detail dialog (edit text, attach images, transition status, publish to Instagram,
view audit history). `brand` is a Brand Hub organized into Positioning / Voice & tone / Audience
/ Objectives / Brand memory / Visual identity — the last one adds two small optional fields
(`primaryColor`, `logoUrl`) to the brand profile schema, backward-compatible with existing docs.

**M5 — Calendar + Approvals.** `calendarEntries` was already defined in `firestore.rules` and
`docs/03-data-model.md` but had no data layer or UI — this milestone adds both on the
already-provisioned collection, not a new one. Month/week/list calendar views, a scheduling
dialog, and an Approvals tab for `in_review` items. The calendar never writes a fake "published"
status; a day chip shows "Published" only when the linked content item has a real `publishes`
record (the same data Instagram publish already writes).

**M6 — Analytics + Integrations.** Analytics reads `usage/{orgId}/{yyyymm}` (already written by
the Worker, already readable per `firestore.rules`) for a real today's-usage budget meter and a
per-provider token breakdown — no cost figure is shown, because the Worker doesn't write one and
fabricating a conversion would be exactly the "fake stats" the brief rules out. Integrations
shows each connection's status from real evidence: Firebase is trivially connected (the page only
renders signed in), the AI Gateway and Cloudinary upgrade from "configured" to "connected" only
once real usage/asset documents exist, and Instagram is never shown as connected without a real
`publishes.instagram` record — it has no client-visible config at all (its credentials are
Worker-only secrets), so it's labeled "configured server-side, unverifiable from the browser."

**M7 — Polish + QA.** Redesigned `assets` (the one page the other milestones' briefs didn't
explicitly name but which still had its original plain styling). Found and fixed a real mobile
layout bug in the Design Studio (a flex child with large intrinsic content width needs
`min-width: 0` to shrink below that size — without it the canvas preview forced horizontal page
scroll at narrow viewports). Localized tone-preset and content-type option labels that were still
English-only in the Arabic UI. Full route-by-route responsive check (verified via
`scrollWidth === innerWidth` in-browser, not just screenshots, after screenshots themselves
turned out to have a scale artifact that doesn't reflect real overflow).

## Engineering decisions worth knowing about

- **Fabric.js over react-konva** for the Design Studio (M3) — see above.
- **Two small schema additions**, both optional and backward-compatible: `brandProfileSchema`
  gained `primaryColor`/`logoUrl` (M4); the Worker's generate request gained
  `toneOverride`/`audienceOverride`/`pillars`/`customInstructions` (M2). Neither changes
  `firestore.rules` — the brand doc's write rule already covers any field on that document, and
  the Worker's request schema is validated server-side, not by Firestore rules.
- **`calendarEntries` (M5)** uses a collection `firestore.rules` already provisioned for it; no
  rules change was needed or made.
- **Route restructure**: authenticated pages moved into an `(app)` route group
  (`src/app/(app)/*`) with a shared layout that centralizes the sign-in redirect
  (`useRequireAuth`) and renders the app shell, removing duplicated redirect boilerplate from
  every page. `/login` stays outside that group with its own minimal centered layout.

## What's verified vs. what isn't

Verified end-to-end in-browser against the live dev Firebase project, not just unit tests:
sign-up → dashboard → brand profile round trip; a real Groq generation saved as a draft and
visible in the Content Library; the Design Studio's template/drag/undo/Save-to-Assets pipeline
producing a real Cloudinary-backed asset; a content item scheduled on the calendar and approved
from the Approvals tab with a real Firestore-backed status transition; Analytics and Integrations
showing the real token/asset/generation counts those actions produced.

**Not verified / explicitly out of scope for this branch:**

- **Instagram publishing** was not exercised against the real Meta API — this was true before
  this branch and remains true; the hard rules for this task explicitly said not to chase live
  Meta credentials.
- **No automated accessibility or contrast-checking tool was run** (see the honesty notes added
  to `docs/02-design-system.md`'s acceptance criteria). Keyboard/RTL/contrast were checked
  manually; treat anything not explicitly called out as unverified rather than assumed passing.
- **`functions/`** (the dormant Cloud Functions duplicate) was not touched. Its lint/typecheck/
  test/build were confirmed still green, but it was not updated to match the Worker's M2 schema
  changes — it was already drifted from the Worker before this branch, and the brief's
  instruction was not to let it drift _further_, not to resynchronize it.

## Running the checks

Three independent packages, each with its own `lint`/`typecheck`/`test`/`build`:

```bash
npm run lint && npm run typecheck && npm test && npm run build        # root (this app)
cd worker && npm run lint && npm run typecheck && npm test && npm run build
cd functions && npm run lint && npm run typecheck && npm test && npm run build
```

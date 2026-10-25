# Phase 1 — Design System Specification

This is a foundation spec (principles, tokens, component inventory) to agree on before any pixel is
drawn in Phase 3 — not the full visual design itself, which is implementation work.

## 1. Principles

- **Premium but calm**: generous whitespace, restrained color use, confident typography. This is a
  tool professionals use daily — it should feel fast and quiet, not like a marketing landing page.
- **Bilingual by construction, not by patch**: Arabic (RTL) and English (LTR) are both first-class.
  Every layout primitive must work mirrored; no hard-coded `left`/`right` — use logical CSS properties
  (`margin-inline-start`, `padding-inline-end`, etc.) and `dir="rtl"`/`dir="ltr"` at the document or
  section level.
- **Accessible by default**: WCAG 2.1 AA minimum — color contrast, keyboard navigation, focus states,
  touch target size (44×44px minimum), screen-reader labeling on every icon-only control.
- **Responsive from the smallest screen up**: mobile-first breakpoints; the content calendar and
  editor views need deliberate design for narrow viewports, not just reflow.

## 2. Token layer

Implemented as CSS variables (not hard-coded Tailwind color classes scattered through components), so
theming (light/dark, and future white-labeling for SaaS tenants) is a token swap:

- **Color**: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`,
  `--color-border`, `--color-accent`, `--color-accent-contrast`, `--color-success`, `--color-warning`,
  `--color-danger`, each with a light and dark value. Accent palette TBD in Phase 3 (brand identity
  work), not invented here.
- **Typography**: a type scale (e.g. `--font-size-xs` … `--font-size-3xl`) and two font stacks — one
  Latin, one Arabic — selected together so x-height and weight feel matched; line-height tokens
  separate for Arabic script (typically needs more leading).
- **Spacing**: a single 4px-based scale (`--space-1` = 4px … `--space-16` = 64px).
- **Radius / elevation**: a small set of radius tokens and 2–3 shadow tokens; avoid a sprawling
  elevation system.
- **Motion**: duration/easing tokens for transitions; respect `prefers-reduced-motion`.

## 3. Component inventory (v1 scope only)

Buttons, inputs/textarea, select, tabs, modal/dialog, toast/notification, card, data table, badge/tag,
avatar, calendar/scheduler grid, kanban-style approval board, platform-preview frame (per-platform
aspect ratio + chrome mock), file/asset uploader with drag-drop, rich-text/markdown editor for
captions/scripts, empty states, skeleton loaders, and a usage/budget meter.

Recommendation: build on a headless/unstyled primitive library (e.g. Radix UI primitives) and apply the
token layer via Tailwind, rather than hand-rolling accessibility behavior (focus trapping, ARIA roles)
for dialogs/menus/tabs from scratch. Confirm the exact library choice in Phase 3 against current
licensing/maintenance status before adding the dependency.

## 4. Platform-preview requirement

Content previews (§ product capability 7 in the brief) need accurate per-platform canvas sizes and UI
chrome (Instagram feed/story, X post, LinkedIn post, TikTok, YouTube thumbnail). This is a dedicated
component family, not a generic "card" — note it now so it isn't improvised late.

## 5. Acceptance criteria for this spec

- [x] Token file exists (`src/app/globals.css`) and every color used by the component library
      (`src/components/ui/*`) resolves to a token. Spacing/sizing still uses Tailwind's default
      scale rather than a bespoke `--space-*` set — not literally "every value," noted honestly.
- [x] Manually verified: every route renders correctly with `dir="rtl"` and Arabic content
      (sidebar/content mirror via logical CSS properties, no literal left/right), checked across
      the dashboard, AI Content Studio, Design Studio, Content Library, Brand Hub, Calendar and
      Integrations pages.
- [ ] No automated contrast-checking tool was run. One real failure (dark-mode active sidebar
      nav text against its background, ~4:1) was found and fixed by manual calculation during M1
      QA — see that commit. The token pairs haven't been swept systematically; treat this as
      unverified rather than passing.
- [ ] No automated a11y scan (axe or equivalent) was run — this repo has no browser-based test
      runner wired up for it. Keyboard operability (dialogs, dropdowns, tabs) was spot-checked
      manually via the Radix primitives those components are built on, which handle focus traps
      and ARIA roles themselves; that is not the same as an automated zero-violations scan.

# Phase 0 — Repository Audit

**Date:** 2026-10-24

## Finding

The target directory (`MY AI BRAND`) was empty when this audit was performed: no source files, no
`package.json`, no Firebase config, no CI config, and no git history. A git repository was initialized
(`main` branch) as part of this audit so the planning artifacts below have version control from day one.

There is **no existing architecture, no existing dependencies, no technical debt, and nothing to
preserve or migrate.** This is a greenfield build.

## Implications for the rest of this plan

- Phase 1 (below) is a genuine architecture proposal, not a reconciliation against existing code.
- No "preserve working features" constraint applies yet — it will apply to every milestone after the
  first one lands.
- Environment separation (dev/staging/prod) and CI should be set up **before** any feature code, so
  every subsequent increment is built and merged under the same guardrails from the start rather than
  retrofitted later.
- Nothing has been installed, deployed, or committed except this documentation set and a `.gitignore`.
  No application code, dependencies, Firebase project, or GitHub remote exists yet.

## Open items that need the user (not blocking the plan, but blocking Phase 3 execution)

1. **GitHub remote** — no remote configured. Need: create/point to a GitHub repo (owner + repo name),
   decide public/private.
2. **Firebase projects** — none created yet. Need: Firebase project IDs (or permission to create) for
   `dev`, `staging`, `prod`, and confirmation of the Google Cloud billing account that will back the
   Blaze (pay-as-you-go) plan — Cloud Functions requires Blaze even at zero usage.
3. **Brand name / domain** — "My AI Brand Studio" is used as a working name throughout; confirm before
   it's baked into Firebase project IDs (which are globally unique and hard to rename later).
4. **Which social platforms matter first** — Instagram/Facebook, TikTok, X, LinkedIn, YouTube each have
   different publishing-API approval processes and limitations; the roadmap treats "official publishing
   integrations" as a later milestone specifically because each one needs its own app-review research
   that shouldn't block earlier milestones.

# Phase 2 — Claude Code Skills, MCP Integrations, Testing Tools, Workflows

Nothing below is installed. These are recommendations to approve before Phase 3; "verified" means
checked against official docs in this session, dated.

## AI provider roster (verified 2026-10-24)

Produced via the `free-llm-api-advisor` skill, which re-checks official provider docs rather than
relying on community lists. Full detail and sources are in `01-architecture-plan.md` §5. Summary:

| Provider                  | Free tier commercial-OK?                 | Training on your data?                             | Role here                       |
| ------------------------- | ---------------------------------------- | -------------------------------------------------- | ------------------------------- |
| Groq                      | Yes (Services Agreement)                 | No; logs ≤30 days, ZDR optional                    | Primary                         |
| Mistral (free mode)       | Not addressed either way                 | Yes, unless you opt out (do so immediately)        | Fallback                        |
| OpenRouter `:free`        | Depends on upstream model                | Upstream-dependent; opt-out setting exists         | Fallback / breadth              |
| Gemini unpaid tier        | Business-use only, not EEA/UK/CH         | **Yes** — used to improve products, human-reviewed | **Not used** for client content |
| NVIDIA NIM / Cohere trial | **No** — explicitly trial/prototype-only | n/a                                                | **Not used**                    |

Re-verify this table before Phase 3 implementation if more than a few weeks pass — these terms and
limits drift, which is exactly why the skill exists.

## Testing stack

- **Vitest** — unit tests, fast, native TS/ESM support, good fit for a Next.js + Functions monorepo.
- **@testing-library/react** — component tests that assert on behavior/accessibility, not internals.
- **Playwright** — end-to-end tests against a locally running build; also used for the bilingual
  RTL/LTR and basic a11y smoke checks.
- **Firebase Emulator Suite** + **@firebase/rules-unit-testing** — run Firestore/Storage/Auth/Functions
  locally in CI; write explicit rules tests (allow/deny pairs) for every collection in the data model,
  especially the "no client write" collections (`usage`, `providerConfigs`, `auditLogs`).

Confirm current package versions at install time (Phase 3) rather than pinning versions in this
planning doc, since they'll be stale by then.

## CI/CD (GitHub Actions)

- `ci.yml`: on every PR — install, lint, typecheck, `vitest run`, start emulators and run
  rules-unit-tests + Playwright against the emulator-backed build.
- `deploy-staging.yml`: on merge to the integration branch — deploy to the staging Firebase project.
- `deploy-prod.yml`: manually triggered (or on tag) with required approval — deploy to prod. Never
  auto-deploy to prod on push.
- Secrets: one GitHub Environment per Firebase project (dev/staging/prod), each holding only that
  environment's service account / deploy token — never a single credential with access to all three.

## Claude Code skills already available in this environment worth using as the build proceeds

- `free-llm-api-advisor` — already used above; re-run it whenever the AI provider roster needs
  re-checking or expanding (e.g. adding a paid provider, or revisiting image generation).
- `security-review` — run before merging any milestone that touches auth, security rules, or the AI
  gateway (i.e. most of them).
- `code-review` — use for PR review; `simplify` after a milestone lands, before it's considered done,
  to catch unnecessary abstraction.
- `dataviz` — load before building the M5 analytics/usage dashboards and the budget meter component,
  so charts and the token/cost visualizations follow a consistent, accessible palette from the start.
- `run` — for exercising the app locally (starting the dev server + emulators together) once there's
  something to run.

## MCP integrations — not recommending any installation yet

No GitHub or Firebase-specific MCP server is connected in this session right now. Before recommending
one, it should be checked against its own official docs/marketplace listing the same way the AI
providers were — this wasn't done in Phase 0/1 because no MCP integration is required to produce this
plan. If/when useful (e.g. a GitHub MCP server for PR/issue workflows once a GitHub remote exists), flag
it at that point rather than installing speculatively now, per the "avoid unnecessary dependencies"
rule in the brief.

## Explicitly not recommended now

- No state-management library (Zustand/Redux/etc.) until a concrete need appears — Next.js
  server state + React state should cover M0–M2.
- No error-tracking SaaS (Sentry etc.) until error volume in staging justifies it; Cloud Logging is
  sufficient to start.
- No video-editing SDK choice yet — M4's video scope needs a decision with the user first (see
  roadmap's "Not scheduled" note) before any tool is evaluated.

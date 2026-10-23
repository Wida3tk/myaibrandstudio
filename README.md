# My AI Brand Studio

AI-powered social media content operating system — brand memory, bilingual (Arabic/English) content
generation, editorial workflow, analytics, and a provider-agnostic AI gateway. Architected to grow into
a multi-tenant SaaS product.

**Status: planning only.** Phase 0 (repository audit) and Phase 1 (architecture plan) are complete and
documented below. Nothing has been installed, deployed, or implemented yet — see
[`docs/00-phase0-audit.md`](docs/00-phase0-audit.md) for what "nothing" means precisely.

## Planning documents

1. [Phase 0 — Repository Audit](docs/00-phase0-audit.md)
2. [Phase 1 — Architecture Plan](docs/01-architecture-plan.md)
3. [Phase 1 — Design System Specification](docs/02-design-system.md)
4. [Phase 1 — Data Model](docs/03-data-model.md)
5. [Phase 1 — Roadmap & Acceptance Criteria](docs/04-roadmap-acceptance-criteria.md)
6. [Phase 2 — Tooling, Skills & MCP Recommendations](docs/05-tooling-recommendations.md)

## Stack (decided, not yet implemented)

Next.js (TypeScript) on Firebase App Hosting / Firebase Hosting + Cloud Functions · Firebase
Authentication · Firestore · Firebase Storage · a custom provider-agnostic AI gateway running only in
Cloud Functions (Groq primary, Mistral/OpenRouter fallback) · GitHub Actions CI/CD across three
separate Firebase projects (dev/staging/prod). No Vercel, no Supabase.

## Blocking items before Phase 3 can start

See the "Open items that need the user" section in `docs/00-phase0-audit.md` — GitHub remote, Firebase
project creation/billing, confirmed brand name, and first-target social platforms.

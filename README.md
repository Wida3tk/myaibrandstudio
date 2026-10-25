# My AI Brand Studio

AI-powered social media content operating system — brand memory, bilingual (Arabic/English) content
generation, editorial workflow, analytics, and a provider-agnostic AI gateway. Architected to grow into
a multi-tenant SaaS product.

**Status: M0–M4 built, deployed and verified against real infrastructure; M5 (Instagram
publishing) built and unit-tested, pending a live Meta app to verify end-to-end.** Live at
**https://myaibrandstudio-dev.web.app** (dev environment). See
[docs/04-roadmap-acceptance-criteria.md](docs/04-roadmap-acceptance-criteria.md) for what's next.

## Planning documents

1. [Phase 0 — Repository Audit](docs/00-phase0-audit.md)
2. [Phase 1 — Architecture Plan](docs/01-architecture-plan.md)
3. [Phase 1 — Design System Specification](docs/02-design-system.md)
4. [Phase 1 — Data Model](docs/03-data-model.md)
5. [Phase 1 — Roadmap & Acceptance Criteria](docs/04-roadmap-acceptance-criteria.md)
6. [Phase 2 — Tooling, Skills & MCP Recommendations](docs/05-tooling-recommendations.md)
7. [Firebase project setup](docs/06-firebase-setup.md)
8. [Cloudflare Worker (AI gateway) setup](docs/07-cloudflare-worker-setup.md)
9. [Deploying the app (Hosting)](docs/08-hosting-deploy.md)
10. [Asset library setup (Cloudinary)](docs/09-cloudinary-setup.md)
11. [Instagram publishing setup](docs/10-instagram-publishing-setup.md)

## Project layout

- `src/` — the Next.js app (Auth, brand profiles, content-generation UI)
- `functions/` — the AI gateway as Firebase Cloud Functions (needs Blaze; dormant until that's
  available — see `docs/01-architecture-plan.md` §8a)
- `worker/` — the same AI gateway as a Cloudflare Worker (**the one actually deployed**, free, no
  card needed)

## Development

```bash
npm install
npm run dev          # http://localhost:3000 — needs .env.local, see below
npm run lint
npm run typecheck
npm test
```

Each of `functions/` and `worker/` is its own package with the same scripts (`npm install && npm
test` etc. inside that directory).

Copy `.env.example` to `.env.local` and fill in your Firebase web app config
(`docs/06-firebase-setup.md`) and the deployed Worker URL (`docs/07-cloudflare-worker-setup.md`).

## Stack

Next.js (TypeScript) on Firebase Hosting · Firebase Authentication · Firestore (free Spark plan) ·
a provider-agnostic AI gateway (Groq primary, Mistral/OpenRouter fallback) running on Cloudflare
Workers · GitHub Actions CI across all three packages. No Vercel, no Supabase, no Blaze (yet — see
`docs/01-architecture-plan.md` §8/§8a for the free-tier sequencing and why Cloud Functions aren't
the live deployment target).

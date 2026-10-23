# Phase 1 — Architecture Plan

## 1. Guiding constraints (from the brief)

- GitHub for source control; Firebase for auth/db/storage/functions/hosting; no Vercel, no Supabase.
- AI calls must never expose provider API keys to the browser.
- Dev / staging / prod must be separate environments.
- Architecture must tolerate becoming a multi-tenant SaaS with billing later, without a rewrite.
- No speculative features, no unnecessary dependencies.

## 2. High-level system

```
Browser (Next.js app, client components)
   |  (Firebase Auth ID token on every request)
   v
Next.js server (Route Handlers / Server Actions)  --- deployed on Firebase Hosting + Cloud Functions/
   |                                                   Cloud Run via the Next.js framework adapter
   v
Firebase Cloud Functions (2nd gen, TypeScript)  <-- the ONLY place that holds AI provider keys
   |                        |                  \
   v                        v                   v
Firestore               Firebase Storage      AI Gateway (provider adapters: Groq, Mistral,
(brand/content/          (media assets,                   OpenRouter, Gemini, future paid providers)
 calendar/usage data)      templates)                      + per-org budget/rate-limit guard
```

Key decision: **all AI provider calls happen server-side in Cloud Functions**, invoked from Next.js
Server Actions/Route Handlers (which run on the server, not in the browser) or directly as callable
Functions. The browser never sees a provider key, a Firebase Admin credential, or a raw provider
response that might contain another tenant's data.

## 3. Why Next.js (not "avoid Vercel" conflict)

"Avoid Vercel" is a hosting-platform constraint, not a framework constraint. Next.js deploys cleanly to
Firebase via **Firebase App Hosting** (Firebase's own Next.js-aware hosting product) or, as a fallback,
Firebase Hosting rewrites to a Cloud Function/Cloud Run service running the Next.js server. Either path
keeps everything inside Firebase/GCP. **Before Phase 3**, confirm current Firebase App Hosting
capabilities/limits for your intended region — it's a newer product and specifics move; the fallback
(Hosting + Cloud Functions rewrite) is the well-established path if App Hosting doesn't fit.

## 4. Core services

| Concern        | Choice                                                                     | Notes                                                                                                                              |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | Firebase Authentication                                                    | Email/password + Google OAuth to start. Custom claims carry `orgId` + `role`.                                                      |
| Database       | Firestore                                                                  | See `03-data-model.md`. Modeled multi-tenant from day one (see §6).                                                                |
| File storage   | Firebase Storage                                                           | Scoped by org/brand path prefix; rules enforce membership.                                                                         |
| Server compute | Cloud Functions (2nd gen) / Next.js server runtime                         | TypeScript throughout.                                                                                                             |
| AI Gateway     | Custom adapter layer, see §5                                               | Provider-agnostic interface; never called from the client.                                                                         |
| Secrets        | Firebase Functions params + Secret Manager                                 | No secrets in `.env` files committed to git.                                                                                       |
| CI/CD          | GitHub Actions                                                             | Lint, typecheck, unit tests, emulator-backed integration tests, build, preview-channel deploy on PR, gated deploy to staging/prod. |
| Observability  | Cloud Logging (structured logs from Functions) + in-app usage/budget views | Add Sentry or similar only if/when error volume justifies the dependency — not a day-one requirement.                              |

## 5. AI Gateway design

A single TypeScript interface, implemented once per provider:

```ts
interface AIProvider {
  id: string; // "groq", "mistral", "openrouter", "gemini", ...
  supports: ("text" | "structured" | "vision" | "image")[];
  generate(req: GenerationRequest): Promise<GenerationResult>;
}
```

- **Router**: picks a provider per request based on task type, current per-org budget/quota remaining,
  and provider health (rolling error/429 rate). On failure or 429, falls back to the next provider in a
  configured chain.
- **Structured output**: requests that need JSON (hooks, captions, calendar entries) are validated
  against a Zod schema after generation; a failed parse triggers one retry with a stricter prompt before
  falling back to the next provider.
- **Budget tracking**: every call writes a usage record (tokens, estimated cost, provider, org, brand)
  to Firestore (`/usage/...`, see data model). The router refuses to call a provider once an org's
  configured budget/rate ceiling is hit, and returns a clear "budget exceeded" error to the UI rather
  than silently failing.
- **Provider roster (free tier, verified 2026-10-24 via the `free-llm-api-advisor` skill against each
  provider's official docs)**:
  - **Primary — Groq**: free plan permits commercial/business use under its Services Agreement, no
    training on inputs/outputs, logs ≤30 days (Zero Data Retention available). OpenAI-compatible API.
  - **Secondary fallback — Mistral (free mode)**: commercial terms not explicit either way, but you can
    opt out of training on your data — do so immediately on account creation.
  - **Tertiary fallback — OpenRouter `:free` pool**: low rate limits (20 RPM / 50–1000 RPD), commercial
    use depends on the specific upstream model, but gives access to many models and has a
    privacy-opt-out setting for free models.
  - **Explicitly NOT used for production brand content**: Google Gemini's unpaid tier (content is used
    to improve Google's products and may be human-reviewed — unacceptable for client brand/content
    data), NVIDIA NIM and Cohere trial keys (both explicitly prototype/trial-only, not for production).
  - **Reality check**: every free tier above is rate-limited and "may change or be withdrawn" in the
    provider's own terms (verified in the skill's provider snapshot). Treat the free roster as the
    default tier for low-volume orgs and for dev/staging, but design the adapter interface so adding a
    paid key (same provider or a new one) for a high-volume org is a config change, not a code change.
  - **Image generation**: none of the verified free-tier providers above offer production-safe free
    image generation (commercial terms and privacy are unverified or restrictive on the ones that do
    have image models). Plan image generation as a paid, budget-tracked provider from the start rather
    than searching for a "free" option — this is explicitly flagged in the brief as a trap to avoid
    ("do not confuse free trials with sustainable free production access").

## 6. Multi-tenancy readiness (without building billing now)

Model data under `/organizations/{orgId}/...` from the very first milestone, even though v1 only ever
creates one org per signing-up user automatically. This means:

- Firestore security rules and Cloud Functions authorization are already role/org-scoped, so adding
  "invite a teammate" or "add a second brand" later is a UI feature, not a data-model migration.
  Adding paid plans/billing later is additive (`/organizations/{orgId}/billing`), not a restructuring.

## 7. Security baseline

- Firestore/Storage security rules default-deny; every collection explicitly allows only
  authenticated members of the owning org, scoped by role (owner/editor/viewer).
- Collections that are system-managed (`usage`, `providerConfigs`, `auditLogs`) are writable only by
  the Admin SDK (Cloud Functions), never directly by clients, even authenticated ones.
- All AI provider keys and any publishing-platform app secrets live in Secret Manager / Functions
  params, scoped per environment (dev/staging/prod each get their own keys).
- Rate limiting and per-org budget ceilings are enforced server-side (§5), not just in the UI.

## 8. Environments

Three separate Firebase projects (e.g. `myaibrandstudio-dev`, `-staging`, `-prod`), each with its own
Auth tenant, Firestore instance, Storage bucket, and Functions deployment. `.firebaserc` holds the
project aliases; GitHub Actions selects the target project per branch/environment via repo/environment
secrets. No environment shares a Firebase project with another.

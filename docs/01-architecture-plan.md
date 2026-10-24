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

## 8. Staying on the free (Spark) plan as long as possible

Confirmed against Firebase's own docs (2026): **Auth and Firestore are free on Spark, no billing
account needed.** Cloud Storage for Firebase has required Blaze (pay-as-you-go) for every bucket,
including the default one, since February 2026 — there is no free-tier path around that. Cloud
Functions (and any other server-side compute, including Firebase App Hosting) has always required
Blaze, regardless of actual usage.

Given that, the build order is deliberately sequenced to delay Blaze as long as the architecture
allows:

- **M0 + M1 run entirely on Spark.** `firestore.rules` allows a signed-in user to self-serve-create
  their own organization (naming themselves `ownerUid`) and their own `owner` membership doc directly
  from the client SDK — no Cloud Function needed to bootstrap a new org. This is why `organizations`
  and `members` creation rules aren't simply "Cloud Functions only."
- **Storage is deliberately not enabled yet.** Nothing before M3 (asset library) needs it; enabling it
  early would force a Blaze upgrade with no corresponding feature to show for it yet.
- **Cloud Functions become unavoidable at M2**, because that's where provider API keys first need to
  live server-side (the AI gateway, §5). There's no way to keep that off Blaze on this stack — but
  Blaze's free quota (as of this writing: 2M function invocations/month, 400,000 GB-seconds compute)
  means actual cost stays $0 for a single low-volume org. Set a Google Cloud **budget alert** (free, a
  few clicks in the console) the same day Blaze is linked, so any real spend is flagged before it
  happens rather than discovered on a bill.

### 8a. Cloudflare Workers instead of Cloud Functions (no card available)

Blaze requires a billing-account payment method, and the user's card wasn't accepted by Google's
verification. Rather than exposing AI provider keys to the browser (which the brief explicitly
rules out, and which this plan does not reconsider just because Blaze is blocked), the AI gateway
runs on **Cloudflare Workers** instead: the Workers Free plan (100,000 requests/day) needs no card
at all, and secrets set via `wrangler secret put` are exactly as inaccessible to the browser as
Firebase Functions secrets would have been. See `docs/07-cloudflare-worker-setup.md` for setup.

This is a deployment-target swap, not an architecture change — `worker/` reuses the exact same
provider-agnostic gateway code (`gateway/`, copied from `functions/`, see that directory's own
README) and the same Firestore data model and security rules. The differences are plumbing specific
to running outside the Admin SDK:

- **Firebase ID token verification** happens manually (`worker/src/auth/verify-token.ts`), the same
  algorithm the Admin SDK uses internally, via Google's public certs and the `jose` library — no
  Node APIs, so it runs on Workers' edge runtime.
- **Firestore access** goes through its REST API (`worker/src/firestore/client.ts`) authenticated as
  a Google service account (`worker/src/auth/service-account.ts`, the JWT-bearer OAuth2 flow) rather
  than the Admin SDK, which needs Node.js and isn't available on Workers.

`functions/` (the Cloud Functions implementation) is left in place, tested and working, as a ready
alternative if Blaze ever does become available — not dead code, a dormant deployment target.

### 8b. Cloudinary instead of Firebase Storage (same reason)

Firebase Storage has required Blaze for every bucket since Feb 2026 (§8) — same blocker, same
no-card constraint. Cloudinary's free plan is confirmed via its own docs to need no card and to be
usable in production. The app uploads directly from the browser to Cloudinary (an unsigned upload
preset, no server/Worker involved — see `docs/09-cloudinary-setup.md`) and stores the resulting URL
in Firestore under the `assets` collection the data model already defines. The trade-off: Cloudinary
delivers at a public URL with no per-org file-level access control, only Firestore's own rules
protect the _metadata_ (which org/brand an asset belongs to). Acceptable for marketing assets headed
for public posting anyway; see the setup doc for when to revisit.

## 9. Environments

Three separate Firebase projects (e.g. `myaibrandstudio-dev`, `-staging`, `-prod`), each with its own
Auth tenant, Firestore instance, Storage bucket, and Functions deployment. `.firebaserc` holds the
project aliases; GitHub Actions selects the target project per branch/environment via repo/environment
secrets. No environment shares a Firebase project with another.

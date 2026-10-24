# AI Gateway Worker setup (Cloudflare Workers)

The AI gateway (`worker/`) runs on Cloudflare Workers instead of Firebase Cloud Functions — see
`docs/01-architecture-plan.md` §8a for why. It needs a free Cloudflare account (no card) and a
Google service account key (also free, no card — a GCP/Firebase IAM credential, unrelated to
billing).

## 1. Cloudflare account

Sign up at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — email + password,
no payment method required for the Workers Free plan (100,000 requests/day).

Then authenticate the CLI from inside `worker/`:

```bash
npx wrangler login
```

This opens a browser for OAuth, the same pattern as `firebase login`.

## 2. A Firestore-scoped service account key

The Worker needs to read/write Firestore without the Admin SDK (it runs on Workers' edge runtime,
not Node.js), so it authenticates as a Google service account instead of using the Firebase CLI's
own login.

1. Open [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=myaibrandstudio-dev)
   for the **dev** project.
2. Use the default `App Engine default service account` (it already has the roles this needs), or
   create a new one scoped to just `Cloud Datastore User`.
3. Open it → **Keys** tab → **Add Key** → **Create new key** → **JSON** → download. This file is a
   credential — never commit it, never paste its contents anywhere other than the `wrangler secret
put` command below.

## 3. Free AI provider keys

See `docs/01-architecture-plan.md` §5 and `docs/05-tooling-recommendations.md` for why these three,
verified via the `free-llm-api-advisor` skill:

- Groq: [console.groq.com/keys](https://console.groq.com/keys)
- Mistral: [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) — opt out of
  training on your data in account settings after signing up (free mode trains by default)
- OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys)

## 4. Set the secrets and deploy

From `worker/`:

```bash
npx wrangler secret put GCP_SERVICE_ACCOUNT_JSON   # paste the entire downloaded JSON file's contents
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put MISTRAL_API_KEY
npx wrangler secret put OPENROUTER_API_KEY
npm run deploy
```

Deploy prints the Worker's URL (`https://myaibrandstudio-ai-gateway.<your-subdomain>.workers.dev`).
Put that in the Next.js app's `.env.local` as `NEXT_PUBLIC_AI_GATEWAY_URL`.

## 5. Local development

`npm run dev` inside `worker/` runs it locally via `wrangler dev` (default `http://localhost:8787`).
For secrets locally, create `worker/.dev.vars` (gitignored, same `KEY=value` format as `.env.local`)
rather than using real `wrangler secret put` — that command only affects the deployed Worker.

## Staying free

Workers Free covers 100,000 requests/day — far beyond what a single low-volume org will use. If
`ALLOWED_ORIGIN` in `wrangler.toml` ever needs to list more than one origin (e.g. once there's a
deployed frontend domain alongside `localhost:3000`), update it there before relying on it in
production; it is currently dev-only.

# Deploying the app (Firebase Hosting, static export)

The Next.js app is fully client-rendered (no Server Actions, no route handlers, no server-side data
fetching) — every page is a client component that does its own Auth/Firestore/Worker calls in the
browser. That means it can ship as a plain static export, which Firebase Hosting serves for free on
the Spark plan, no Blaze needed (`next.config.ts` sets `output: "export"`).

## Deploy

```bash
npm run build          # writes the static site to out/
npx firebase deploy --only hosting --project dev   # or staging / prod
```

The dev site is live at **https://myaibrandstudio-dev.web.app**.

## Before deploying to staging/prod

1. Point `.env.local` (or rather, build with the right env — see below) at that environment's
   Firebase project and Worker URL.
2. Add that environment's Hosting domains (`https://<project>.web.app` and
   `https://<project>.firebaseapp.com`) to the Worker's `ALLOWED_ORIGINS` in `worker/wrangler.toml`,
   then `npm run deploy` inside `worker/` again — the Worker only accepts requests from origins it
   knows about.
3. Firebase Auth's authorized-domains list already includes a project's own `.web.app` /
   `.firebaseapp.com` domains automatically; only a custom domain would need adding by hand.

## Known cosmetic issue

Next.js's client-side link-prefetching requests a per-segment RSC payload
(`/<route>/__next.<route>.__PAGE__.txt`) that the static export doesn't generate at that exact path
(it generates `<route>.txt` instead, which Next falls back to) — shows as harmless 404s in the
browser console on navigation. Doesn't affect functionality; not worth suppressing yet.

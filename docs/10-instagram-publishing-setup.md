# Instagram publishing setup (M5)

Verified against Meta's own docs (developers.facebook.com/docs/instagram-platform/
instagram-api-with-instagram-login/, checked 2026-10-25). This is the **Instagram API with
Instagram Login** path — no Facebook Page required, and **no App Review needed** to publish to
your own account (Standard Access already covers accounts you own/manage and add to your own app
in the App Dashboard).

## 1. Create the Meta app

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App** → type
   **Business**.
2. In the app's left sidebar: **Instagram** → **API setup with Instagram business login**.
3. Follow its steps to connect your Instagram **Business** or **Creator** account.
4. Click **Generate token** next to that account.
5. Copy the **Access Token** (long-lived, valid 60 days) and the **Instagram User ID** shown on
   the same page.

Caveat from Meta's docs: if the Instagram account is linked to a Facebook Page that requires Page
Publishing Authorization (PPA), publishing is blocked until that's completed — there's no way to
check this in advance; a failed publish attempt would surface it.

## 2. Configure the Worker

```bash
cd worker
npx wrangler secret put IG_ACCESS_TOKEN   # paste the access token
```

Add the Instagram User ID (not a secret) to `worker/wrangler.toml`'s `[vars]`:

```toml
IG_USER_ID = "<the Instagram User ID from step 1>"
```

Then redeploy: `npm run deploy` (inside `worker/`).

## 3. Token renewal

The access token expires after 60 days. Meta's docs describe a server-to-server exchange
(`GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&...`) for a fresh
60-day token — not automated yet (v1 is a manual "generate a new token and re-run `wrangler secret
put`" every ~60 days). Automating this is a reasonable follow-up once the manual flow is confirmed
working.

## How publishing works

`worker/src/instagram/publish.ts` implements Meta's two-step flow: create a media container
(`POST /{IG_USER_ID}/media` with `image_url` + `caption`), poll it until `status_code` is
`FINISHED`, then `POST /{IG_USER_ID}/media_publish`. The image must be a public JPEG URL —
Cloudinary-hosted assets already qualify. On success, the Worker (not the client) writes the
content item's `published` status and the Instagram permalink straight to Firestore, so a
"published" badge in the UI is backed by a real confirmed publish, not a client-side claim.

## Known limits (from Meta's docs)

- 100 API-published posts per 24-hour moving period (one source on the same page says 50 for
  carousels specifically — unresolved conflict, not likely to matter at this app's volume).
- Single images must be JPEG.
- `instagram_business_basic` + `instagram_business_content_publish` scopes are what the generated
  token carries; nothing further to request for this feature.

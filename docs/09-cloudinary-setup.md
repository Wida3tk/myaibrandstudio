# Asset library setup (Cloudinary)

Firebase Storage requires Blaze for every bucket (confirmed Feb 2026, see
`docs/01-architecture-plan.md` §8) — not available (card wasn't accepted). Cloudinary's free plan is
confirmed via its own docs to need no card at all and to be usable in production, so the asset
library (M3) uploads there instead of Firebase Storage. Everything else (Auth, Firestore, the AI
gateway) is unaffected.

## 1. Sign up

[cloudinary.com](https://cloudinary.com) — email or Google/GitHub, no payment method. Your **cloud
name** is shown right on the dashboard home page after signup.

## 2. Create an unsigned upload preset

Uploads happen directly from the browser to Cloudinary, with no server in between — that only works
with an **unsigned** preset (a signed one needs a server-side-generated signature per upload, which
this static-export app doesn't have).

1. Dashboard → **Settings** (gear icon) → **Upload** tab.
2. Under "Upload presets" → **Add upload preset**.
3. Set **Signing Mode** to **Unsigned**.
4. Save, note the preset's name (e.g. `ml_default` or whatever you name it).

Neither the cloud name nor an unsigned preset name is a secret — they're meant to be embedded in
client code, the same way a Firebase web API key is (access control and abuse limits live on
Cloudinary's side, not in keeping the name hidden).

## 3. Configure the app

Add to `.env.local`:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your cloud name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your preset name>
```

Rebuild and redeploy (`npm run build && npx firebase deploy --only hosting --project dev`) for a
live environment, same as any other env change.

## Known trade-off

Cloudinary's free unsigned uploads deliver assets at a public URL — there's no per-org access
control on the file itself (only the _metadata_ in Firestore, listing which assets belong to which
org/brand, is protected by `firestore.rules`). Acceptable for marketing/social content that's
headed for public posting anyway; revisit if the library ever needs to hold anything not meant to
become public.

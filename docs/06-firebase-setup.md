# Firebase project setup (one-time, do this before deploying anything)

Not done yet — this repo has no `.firebaserc` and no real Firebase project IDs committed, by design
(see `docs/00-phase0-audit.md`'s blocking items). Steps to actually stand up the three environments:

1. **Confirm the brand/project name first.** Firebase project IDs are globally unique across all of
   Firebase/GCP and effectively permanent — renaming later means migrating data, not editing a string.
2. Create three Firebase projects (e.g. in the Firebase console, or `firebase projects:create` via the
   CLI once logged in): one each for `dev`, `staging`, `prod`. Each needs the **Blaze (pay-as-you-go)**
   plan linked to a billing account — Cloud Functions requires it even if usage stays at $0.
3. Copy `.firebaserc.example` to `.firebaserc` and replace the three placeholder IDs with the real
   project IDs you just created. `.firebaserc` is intentionally **not** committed with real IDs in
   advance — the placeholder file is the thing that's version-controlled.
4. In each project's console: enable **Authentication** (Email/Password + Google providers), create a
   **Firestore** database (production mode — the rules in `firestore.rules` already default-deny
   everything not explicitly allowed), and enable **Storage**.
5. Deploy rules once the project IDs exist: `npx firebase deploy --only firestore:rules,storage:rules
--project dev` (repeat per environment). `firebase-tools` is already a devDependency in this repo —
   no global install needed, just run it via `npx`.
6. **Local emulator use requires a JDK.** This dev machine does not currently have Java installed
   (`java -version` fails) — the Firestore/Storage emulators run on it. Install one (e.g. Temurin 21)
   before running `npx firebase emulators:start`; rules-unit-tests in CI will also need Java in the
   CI runner image (GitHub's `ubuntu-latest` runners already include a JDK, so this mainly matters for
   local development on this machine).
7. GitHub Actions secrets: one GitHub **Environment** per Firebase project (`dev`, `staging`, `prod`),
   each holding only that environment's Firebase service-account key / deploy token. Never put a
   credential with access to all three environments in one place.

Nothing past step 3 can happen without real project IDs — that's the genuinely blocking item from
Phase 0. Everything in this repo up to that point (rules, config, app code) is ready to point at real
projects the moment they exist.

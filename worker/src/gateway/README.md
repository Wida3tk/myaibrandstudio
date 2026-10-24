# Gateway logic — intentionally duplicated

This directory is a copy of `functions/src/gateway/`. Both `functions/` (Cloud Functions, needs
Blaze) and `worker/` (Cloudflare Workers, free, no card) are legitimate deployment targets for the
same provider-agnostic AI gateway — see `docs/01-architecture-plan.md` §8a for why there are two.
The adapter/router/budget/schema logic here is pure (fetch + Zod, no platform-specific APIs), so it
runs unmodified in either runtime. Kept as a plain copy rather than a shared package to avoid cross
-runtime build tooling for ~250 lines of code; if one changes, mirror the change in the other.

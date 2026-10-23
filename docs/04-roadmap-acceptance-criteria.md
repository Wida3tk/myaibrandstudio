# Phase 1 — Implementation Roadmap & Acceptance Criteria

Ordered by dependency, not by "importance" — later milestones need earlier ones to exist. Each
milestone should land as its own set of small, reviewable PRs (per the engineering requirements), not
one giant branch.

## M0 — Foundations
Repo scaffolding (Next.js + TypeScript), ESLint/Prettier/strict TS, `.gitignore`, GitHub Actions CI
skeleton (lint + typecheck on PR), three Firebase projects created and wired via `.firebaserc`, Firebase
Auth with email/password + Google sign-in, empty-but-secured Firestore (default-deny rules deployed),
design token file, base layout with working RTL/LTR switch.

**Acceptance criteria**
- [ ] CI runs lint + typecheck on every PR and fails the build on error.
- [ ] A new user can sign up/sign in against the **dev** Firebase project only; staging/prod are
      unreachable from a local dev build.
- [ ] Firestore rules deployed and a rules-unit-test proves an unauthenticated read is denied.
- [ ] Switching the app's language flips `dir` and layout without visual breakage on at least the
      shell/navigation.

## M1 — Brand Profiles & Memory
Create/edit a brand profile (identity, voice, audience, objectives); persistent brand memory storage
and a way to view/edit the stored facts.

**Acceptance criteria**
- [ ] A user can create a brand, fill every field in the data model's `brands` doc, and reload to see
      it persisted.
- [ ] Brand memory facts entered in one session are available (and used) in a later session's AI
      generation, verified by a test that checks the prompt sent to the provider includes them.

## M2 — AI Gateway + Core Generation
Provider-agnostic gateway (Groq primary, Mistral + OpenRouter fallback, per architecture plan §5),
budget/usage tracking, structured-output validation; UI for generating posts/hooks/captions/scripts
and a basic content calendar, bilingual (Arabic + English), with citations surfaced wherever research
claims are shown.

**Acceptance criteria**
- [ ] Killing the primary provider (simulated failure) causes a fallback call, visible in `/usage`
      records, with no user-facing error for a transient single-provider outage.
- [ ] A generation request that exceeds the org's configured budget is refused server-side with a
      clear error, even if the client is modified to retry.
- [ ] Generated content in Arabic renders correctly RTL in every surface it appears (editor, preview,
      calendar).
- [ ] No AI provider key appears in any client-side bundle or network request visible in the browser.

## M3 — Editorial Workflow & Asset Library
Drafts, revisions, approval workflow (the `approvals` collection), creative asset library, editable
templates.

**Acceptance criteria**
- [ ] A content item can move draft → in_review → approved with role-gated transitions (only
      owner/editor can approve) and a visible audit trail.
- [ ] Uploaded assets are scoped to their brand/org in both Storage security rules and the UI (no
      cross-org asset leakage, verified by a rules test).

## M4 — Platform Previews & Image/Video Workflows
Per-platform preview components (per design system §4), image generation integration (paid, budgeted —
see architecture plan §5), video production workflow (editing/assembly pipeline scope to be confirmed
with the user before this milestone starts, since "video production workflows" in the brief is broad).

**Acceptance criteria**
- [ ] Each supported platform has a visually accurate preview for at least one content type.
- [ ] Image generation cost is tracked in `/usage` identically to text generation.

## M5 — Analytics & Publishing Integrations
Performance analytics ingestion + recommendations; official publishing integrations for whichever
platforms are approved/confirmed (each platform's API approval process researched and verified
individually before building against it — this is explicitly the milestone where "verify API
availability, licensing, privacy, commercial-use terms and publishing limitations" from the brief gets
applied platform-by-platform).

**Acceptance criteria**
- [ ] At least one platform's publish flow works end-to-end in staging against that platform's
      sandbox/test mode before any production publishing is enabled.
- [ ] Analytics recommendations are traceable to the underlying metrics they're derived from (no
      opaque "AI says so" outputs).

## M6 — Multi-Tenant / SaaS Readiness
Team invites, role management UI (data model already supports this from M0), billing scaffolding
(no live payment processing yet unless separately approved), admin tooling for `providerConfigs`.

**Acceptance criteria**
- [ ] A second user can be invited to an existing org, assigned a role, and their access matches that
      role exactly (tested for over- and under-permissioning).

---

**Not scheduled, pending user prioritization**: specific video-editing depth, specific analytics
sources per platform (depends on which official APIs are pursued in M5), and any billing/payment
processor choice (explicitly a "later" item in the brief, not v1).

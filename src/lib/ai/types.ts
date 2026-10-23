// Mirrors functions/src/gateway/types.ts. Kept as a small, stable, hand-duplicated type rather
// than sharing a package across the Next.js app and the Cloud Functions codebase — not worth the
// build-tooling complexity for two string unions.
export type ContentType =
  "post" | "hook" | "caption" | "script" | "calendar-note";
export type Language = "ar" | "en";

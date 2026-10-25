import { z } from "zod";

// M3 scope was draft -> in_review -> approved; M5 adds "published", set only after a real
// publish call succeeds (see publishes below) — never a manual transition.
export const contentStatusSchema = z.enum([
  "draft",
  "in_review",
  "approved",
  "published",
]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const historyEntrySchema = z.object({
  uid: z.string(),
  action: z.string(),
  fromStatus: contentStatusSchema.nullable(),
  toStatus: contentStatusSchema,
  at: z.string(), // ISO timestamp — set client-side for immediate display; see data.ts
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const generatedContentSchema = z.object({
  hook: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  callToAction: z.string(),
});

// M4 scope: which platforms this content is previewed/targeted for. Each has its own preview
// chrome — see src/components/platform-previews/.
export const platformSchema = z.enum(["instagram", "x", "linkedin", "tiktok"]);
export type Platform = z.infer<typeof platformSchema>;

export const PLATFORMS: Platform[] = ["instagram", "x", "linkedin", "tiktok"];

// Set only by the publish Worker endpoint after Meta actually confirms the post is live —
// never written by the client, so it's trustworthy evidence a publish really happened.
export const publishRecordSchema = z.object({
  mediaId: z.string(),
  permalink: z.string(),
  publishedAt: z.string(),
});
export type PublishRecord = z.infer<typeof publishRecordSchema>;

export const contentItemSchema = z.object({
  id: z.string(),
  type: z.enum(["post", "hook", "caption", "script", "calendar-note"]),
  language: z.enum(["ar", "en"]),
  topic: z.string(),
  structuredPayload: generatedContentSchema,
  status: contentStatusSchema,
  history: z.array(historyEntrySchema),
  createdBy: z.string(),
  platformTargets: z.array(platformSchema),
  imageUrl: z.string().nullable(),
  publishes: z.record(z.string(), publishRecordSchema),
});
export type ContentItem = z.infer<typeof contentItemSchema>;

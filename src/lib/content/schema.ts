import { z } from "zod";

// M3 scope: draft -> in_review -> approved. "scheduled"/"published" are reserved for M4/M5
// (platform previews, publishing integrations) — the data model allows them, nothing here uses
// them yet.
export const contentStatusSchema = z.enum(["draft", "in_review", "approved"]);
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

export const contentItemSchema = z.object({
  id: z.string(),
  type: z.enum(["post", "hook", "caption", "script", "calendar-note"]),
  language: z.enum(["ar", "en"]),
  topic: z.string(),
  structuredPayload: generatedContentSchema,
  status: contentStatusSchema,
  history: z.array(historyEntrySchema),
  createdBy: z.string(),
});
export type ContentItem = z.infer<typeof contentItemSchema>;

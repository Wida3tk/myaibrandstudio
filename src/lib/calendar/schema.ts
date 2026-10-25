import { z } from "zod";
import { platformSchema } from "@/lib/content/schema";

// Matches docs/03-data-model.md's calendarEntries shape. publishStatus only ever moves to
// "scheduled" from this app's UI — nothing here auto-publishes; a real publish still has to go
// through the Instagram publish flow, which is what the calendar cross-references for display.
export const calendarPublishStatusSchema = z.enum(["scheduled", "published"]);
export type CalendarPublishStatus = z.infer<typeof calendarPublishStatusSchema>;

export const calendarEntrySchema = z.object({
  id: z.string(),
  contentItemId: z.string(),
  platform: platformSchema,
  // Date-only ISO string ("2026-11-03") — the calendar is day-granularity, not time-of-day.
  scheduledFor: z.string(),
  publishStatus: calendarPublishStatusSchema,
});
export type CalendarEntry = z.infer<typeof calendarEntrySchema>;

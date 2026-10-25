import { z } from "zod";

// Mirrors what worker/src/index.ts actually writes to usage/{orgId}/{yyyymm}/{entryId} — no
// costEstimate field exists yet, so this app never displays one (would be fabricated).
export const usageEntrySchema = z.object({
  provider: z.string(),
  model: z.string().optional().default(""),
  brandId: z.string().optional().default(""),
  contentType: z.string().optional().default(""),
  tokensIn: z.number().default(0),
  tokensOut: z.number().default(0),
  date: z.string(),
});
export type UsageEntry = z.infer<typeof usageEntrySchema>;

/** "202610" for the given date, matching the Worker's own yyyymm path segment. */
export function yyyymm(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

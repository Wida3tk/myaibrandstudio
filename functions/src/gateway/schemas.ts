import { z } from "zod";

export const generatedContentSchema = z.object({
  hook: z.string().trim().min(1),
  caption: z.string().trim().min(1),
  hashtags: z.array(z.string().trim().min(1)).max(15).default([]),
  callToAction: z.string().trim().optional().default(""),
});

export type GeneratedContent = z.infer<typeof generatedContentSchema>;

import { z } from "zod";

const platformIdSchema = z.enum([
  "ig-post",
  "ig-story",
  "linkedin-post",
  "x-post",
  "tiktok",
  "custom-square",
]);

export const creativeBriefRequestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  objective: z.string().trim().min(1).max(500),
  platform: platformIdSchema,
  language: z.enum(["ar", "en"]),
  width: z.number().int().positive().max(4000),
  height: z.number().int().positive().max(4000),
  style: z.string().trim().max(200).optional(),
  audienceOverride: z.string().trim().max(500).optional(),
  requiredText: z.string().trim().max(300).optional(),
  customInstructions: z.string().trim().max(1000).optional(),
});

export type CreativeBriefInput = z.infer<typeof creativeBriefRequestSchema>;

// Validates the AI creative director's JSON output — the schema the task asks be enforced on
// every generated creative spec before it ever reaches the layout composer.
export const creativeSpecSchema = z.object({
  campaignConcept: z.string().trim().min(1).max(300),
  headline: z.string().trim().min(1).max(120),
  supportingCopy: z.string().trim().min(1).max(400),
  cta: z.string().trim().min(1).max(40),
  visualDirection: z.string().trim().min(1).max(500),
  colorPalette: z
    .array(z.string().trim().regex(/^#[0-9a-fA-F]{6}$/))
    .min(2)
    .max(6),
  imagePrompts: z.array(z.string().trim().min(1).max(400)).min(1).max(3),
  layoutComposition: z.string().trim().min(1).max(500),
  typographyHierarchy: z.object({
    headline: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(200),
    cta: z.string().trim().min(1).max(200),
  }),
  platformDimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  brandConstraints: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
});

export type CreativeSpecOutput = z.infer<typeof creativeSpecSchema>;

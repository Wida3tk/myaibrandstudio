import { z } from "zod";

// M1 simplification: one brand per org, stored at a fixed doc id. The data model
// (docs/03-data-model.md) supports multiple brands per org; multi-brand UI is later work,
// not a data-model change.
export const PRIMARY_BRAND_ID = "primary";

export const brandProfileSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(200),
  voiceTone: z.string().trim().max(500).optional().default(""),
  audienceDescription: z.string().trim().max(1000).optional().default(""),
  objectives: z.array(z.string().trim().min(1)).max(20).default([]),
  memoryFacts: z.array(z.string().trim().min(1)).max(50).default([]),
  // Visual identity (M4): optional, used to pre-fill the Design Studio and previews.
  primaryColor: z
    .string()
    .trim()
    .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), {
      message: "Must be a hex color like #6750D8",
    })
    .optional()
    .default(""),
  logoUrl: z.string().trim().optional().default(""),
});

export type BrandProfileInput = z.infer<typeof brandProfileSchema>;

export type BrandProfileDoc = BrandProfileInput & {
  createdAt?: unknown;
  updatedAt?: unknown;
};

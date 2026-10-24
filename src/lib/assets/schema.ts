import { z } from "zod";

export const assetSchema = z.object({
  id: z.string(),
  url: z.string(),
  publicId: z.string(),
  kind: z.enum(["image", "video"]),
  tags: z.array(z.string()),
  createdBy: z.string(),
});
export type Asset = z.infer<typeof assetSchema>;

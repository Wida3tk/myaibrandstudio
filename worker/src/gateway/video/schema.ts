import { z } from "zod";

export const videoScriptRequestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  objective: z.string().trim().min(1).max(500),
  language: z.enum(["ar", "en"]),
  targetDurationSeconds: z.number().int().min(10).max(120),
  style: z.string().trim().max(200).optional(),
  audienceOverride: z.string().trim().max(500).optional(),
  customInstructions: z.string().trim().max(1000).optional(),
});

export type VideoScriptRequestInput = z.infer<typeof videoScriptRequestSchema>;

const videoSceneSchema = z.object({
  order: z.number().int().min(1),
  durationSeconds: z.number().positive().max(30),
  visualDescription: z.string().trim().min(1).max(400),
  onScreenText: z.string().trim().max(120).default(""),
  voiceoverLine: z.string().trim().max(400).default(""),
});

// Validates the AI script writer's JSON output — the schema the task asks be enforced before any
// scene reaches storyboard generation or rendering.
export const videoScriptSchema = z.object({
  title: z.string().trim().min(1).max(120),
  logline: z.string().trim().min(1).max(300),
  scenes: z.array(videoSceneSchema).min(2).max(10),
});

export type VideoScriptOutput = z.infer<typeof videoScriptSchema>;

export const videoVoiceoverRequestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  text: z.string().trim().min(1).max(400),
  language: z.enum(["ar", "en"]),
});

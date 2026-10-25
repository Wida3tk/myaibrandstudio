import { z } from "zod";

const canvasObjectSchema = z.object({
  role: z.string().trim().min(1).max(40),
  type: z.enum(["textbox", "rect", "image", "gradient"]),
  text: z.string().max(400).optional(),
  fontSize: z.number().positive().optional(),
  fill: z.string().max(60).optional(),
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
});

export const reviseRequestSchema = z.object({
  orgId: z.string().min(1),
  brandId: z.string().min(1),
  instruction: z.string().trim().min(1).max(300),
  language: z.enum(["ar", "en"]),
  canvasWidth: z.number().positive(),
  canvasHeight: z.number().positive(),
  objects: z.array(canvasObjectSchema).max(30),
});

export type ReviseRequestInput = z.infer<typeof reviseRequestSchema>;

// Deliberately a closed allowlist (`.strict()`), not an arbitrary key/value bag — the AI can move,
// resize, restyle or retext an existing object, but can never set a property outside this list.
const editPropsSchema = z
  .object({
    text: z.string().max(400).optional(),
    fill: z.string().max(60).optional(),
    fontSize: z.number().positive().max(600).optional(),
    fontWeight: z.string().max(10).optional(),
    left: z.number().optional(),
    top: z.number().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    opacity: z.number().min(0).max(1).optional(),
    visible: z.boolean().optional(),
    scaleX: z.number().positive().max(20).optional(),
    scaleY: z.number().positive().max(20).optional(),
  })
  .strict();

const editOpSchema = z.object({
  role: z.string().trim().min(1).max(40),
  action: z.literal("set"),
  props: editPropsSchema,
});

export const reviseResponseSchema = z.object({
  ops: z.array(editOpSchema).max(12).default([]),
});

export type ReviseResponse = z.infer<typeof reviseResponseSchema>;
export type EditOp = z.infer<typeof editOpSchema>;

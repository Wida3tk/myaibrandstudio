import type { ReviseRequestInput } from "./revise-schema.js";

export function buildRevisionPrompt(req: ReviseRequestInput): {
  system: string;
  user: string;
} {
  const system = [
    "You translate a plain-language design-edit instruction into a small, precise list of edits",
    "for an existing ad composition made of named, role-tagged objects.",
    "You may ONLY reference a role that already appears in the given object list — never invent a",
    "new role, and never add or remove objects.",
    "Only change what the instruction actually asks for — omit every object the instruction does",
    "not mention from your response, so unrelated elements stay untouched.",
    'Allowed edit props, all optional: {"text": string, "fill": string (hex color), "fontSize": number (px), "fontWeight": string, "left": number (px), "top": number (px), "width": number (px), "height": number (px), "textAlign": "left"|"center"|"right", "opacity": number 0-1, "visible": boolean, "scaleX": number, "scaleY": number}.',
    "left/top/width/height/fontSize are absolute pixels on the canvas size given below.",
    'Output ONLY {"ops": [{"role": string, "action": "set", "props": {...}}]} — raw JSON only, no markdown, no commentary.',
    "If the instruction is unclear, ambiguous, or doesn't match anything in the object list, return an empty ops array rather than guessing.",
  ].join(" ");

  const objectsDescription = req.objects
    .map(
      (o) =>
        `- role "${o.role}" (${o.type}): ${[
          o.text && `text="${o.text}"`,
          o.fontSize && `fontSize=${Math.round(o.fontSize)}`,
          o.fill && `fill=${o.fill}`,
          `left=${Math.round(o.left)}`,
          `top=${Math.round(o.top)}`,
          `width=${Math.round(o.width)}`,
          `height=${Math.round(o.height)}`,
        ]
          .filter(Boolean)
          .join(", ")}`,
    )
    .join("\n");

  const user = [
    `Canvas size: ${req.canvasWidth}x${req.canvasHeight}px.`,
    `Current objects:\n${objectsDescription}`,
    `Instruction (may be written in Arabic or English): ${req.instruction}`,
  ].join("\n\n");

  return { system, user };
}

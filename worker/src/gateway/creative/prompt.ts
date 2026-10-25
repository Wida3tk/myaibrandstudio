import type { CreativeBriefRequest } from "./types.js";

export function buildCreativePrompt(req: CreativeBriefRequest): {
  system: string;
  user: string;
} {
  const languageInstruction =
    req.language === "ar"
      ? "Write headline, supportingCopy and cta entirely in Arabic (Modern Standard Arabic, natural marketing tone)."
      : "Write headline, supportingCopy and cta entirely in English.";

  const system = [
    "You are an AI Creative Director for a social-media ad agency, turning a short brief into a complete, structured creative specification that a layout engine will render automatically — the user never designs anything by hand.",
    languageInstruction,
    "imagePrompts must ALWAYS be written in English regardless of the output language, describing only a BACKGROUND/SCENE image for a text-to-image model (photography or illustration style, mood, subject, lighting, composition).",
    "imagePrompts must NEVER ask for any text, words, letters, numbers, logos or typography to appear in the image — all copy is overlaid separately as real editable text, and image models render text unreliably (this matters especially for Arabic).",
    "layoutComposition must describe where elements go (e.g. 'full-bleed background image, headline lower third, logo top-right, CTA button bottom-center') without fixed pixel coordinates — the layout engine adapts it to the canvas.",
    "colorPalette must be 2-6 hex colors that work together and, if a brand primary color is given, must include it or a close harmonious variant.",
    'Output ONLY a JSON object with this exact shape: {"campaignConcept": string, "headline": string, "supportingCopy": string, "cta": string, "visualDirection": string, "colorPalette": string[], "imagePrompts": string[], "layoutComposition": string, "typographyHierarchy": {"headline": string, "body": string, "cta": string}, "platformDimensions": {"width": number, "height": number}, "brandConstraints": string[]}.',
    "No markdown, no extra commentary, no code fences — raw JSON only.",
  ].join(" ");

  const user = [
    `Brand: ${req.brandName}`,
    req.brandVoice && `Brand voice: ${req.brandVoice}`,
    req.brandAudience && `Audience: ${req.brandAudience}`,
    req.audienceOverride && `Audience for this campaign: ${req.audienceOverride}`,
    req.brandMemoryFacts.length > 0 &&
      `Brand rules (must follow): ${req.brandMemoryFacts.join("; ")}`,
    req.brandPrimaryColor && `Brand primary color: ${req.brandPrimaryColor}`,
    `Logo available: ${req.brandHasLogo ? "yes — leave clear space for it, never redesign or recreate it" : "no"}`,
    `Campaign objective: ${req.objective}`,
    `Platform: ${req.platform} (${req.width}x${req.height}px)`,
    req.style && `Visual style direction: ${req.style}`,
    req.requiredText &&
      `Text that MUST appear verbatim somewhere in the copy: ${req.requiredText}`,
    req.customInstructions && `Additional instructions (must follow): ${req.customInstructions}`,
    `platformDimensions in your response must be exactly {"width": ${req.width}, "height": ${req.height}}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

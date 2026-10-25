import type { GenerationRequest } from "./types.js";

export function buildPrompt(req: GenerationRequest): {
  system: string;
  user: string;
} {
  const languageInstruction =
    req.language === "ar"
      ? "Respond entirely in Arabic (Modern Standard Arabic, natural social-media tone)."
      : "Respond entirely in English.";

  const system = [
    "You are a social media content assistant writing on behalf of a specific brand.",
    languageInstruction,
    'Output ONLY a JSON object with this exact shape: {"hook": string, "caption": string, "hashtags": string[], "callToAction": string}. Hashtags must be plain words with no "#" symbol — the app adds it.',
    "No markdown, no extra commentary, no code fences — raw JSON only.",
  ].join(" ");

  const user = [
    req.brandVoice && `Brand voice: ${req.brandVoice}`,
    req.toneOverride && `Tone for this piece: ${req.toneOverride}`,
    req.brandAudience && `Audience: ${req.brandAudience}`,
    req.audienceOverride && `Audience for this piece: ${req.audienceOverride}`,
    req.brandMemoryFacts.length > 0 &&
      `Brand rules (must follow): ${req.brandMemoryFacts.join("; ")}`,
    req.pillars &&
      req.pillars.length > 0 &&
      `Content pillars to draw from: ${req.pillars.join(", ")}`,
    `Content type requested: ${req.contentType}`,
    `Topic: ${req.topic}`,
    req.customInstructions &&
      `Additional instructions (must follow): ${req.customInstructions}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

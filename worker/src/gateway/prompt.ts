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
    'Output ONLY a JSON object with this exact shape: {"hook": string, "caption": string, "hashtags": string[], "callToAction": string}',
    "No markdown, no extra commentary, no code fences — raw JSON only.",
  ].join(" ");

  const user = [
    req.brandVoice && `Brand voice: ${req.brandVoice}`,
    req.brandAudience && `Audience: ${req.brandAudience}`,
    req.brandMemoryFacts.length > 0 &&
      `Brand rules (must follow): ${req.brandMemoryFacts.join("; ")}`,
    `Content type requested: ${req.contentType}`,
    `Topic: ${req.topic}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

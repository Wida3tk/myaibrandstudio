import type { VideoScriptBriefRequest } from "./types.js";

export function buildVideoScriptPrompt(req: VideoScriptBriefRequest): {
  system: string;
  user: string;
} {
  const languageInstruction =
    req.language === "ar"
      ? "Write onScreenText and voiceoverLine entirely in Arabic (Modern Standard Arabic, natural spoken tone for a voiceover)."
      : "Write onScreenText and voiceoverLine entirely in English.";

  const system = [
    "You are an AI video script writer for short-form social video (Reels/TikTok/Shorts style),",
    "breaking a brief into a scene-by-scene script a layout engine will turn into a real rendered video.",
    languageInstruction,
    "visualDescription must ALWAYS be written in English regardless of the script language, describing",
    "only a BACKGROUND/SCENE image for a text-to-image model (photography or illustration style, subject,",
    "mood, composition) — never ask it to render any text, numbers or logos; that's added separately.",
    "voiceoverLine is what a narrator says for that scene — natural spoken sentences, not written-ad copy.",
    "onScreenText is short on-screen text for that scene (a few words), not the full voiceover line.",
    "Scene durations must sum to approximately the requested target duration, each scene 2-8 seconds.",
    'Output ONLY a JSON object with this exact shape: {"title": string, "logline": string, "scenes": [{"order": number, "durationSeconds": number, "visualDescription": string, "onScreenText": string, "voiceoverLine": string}]}.',
    "No markdown, no extra commentary, no code fences — raw JSON only.",
  ].join(" ");

  const user = [
    `Brand: ${req.brandName}`,
    req.brandVoice && `Brand voice: ${req.brandVoice}`,
    req.brandAudience && `Audience: ${req.brandAudience}`,
    req.audienceOverride && `Audience for this video: ${req.audienceOverride}`,
    req.brandMemoryFacts.length > 0 &&
      `Brand rules (must follow): ${req.brandMemoryFacts.join("; ")}`,
    `Video objective: ${req.objective}`,
    `Target duration: ~${req.targetDurationSeconds} seconds`,
    req.style && `Visual/tone style direction: ${req.style}`,
    req.customInstructions &&
      `Additional instructions (must follow): ${req.customInstructions}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

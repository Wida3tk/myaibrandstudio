import { authedPost } from "@/lib/creative/generate";
import type { VideoScriptBrief } from "./types";

export interface VideoScriptScene {
  order: number;
  durationSeconds: number;
  visualDescription: string;
  onScreenText: string;
  voiceoverLine: string;
}

export interface VideoScriptResult {
  title: string;
  logline: string;
  scenes: VideoScriptScene[];
}

export async function generateVideoScript(
  orgId: string,
  brandId: string,
  brief: VideoScriptBrief,
): Promise<{ script: VideoScriptResult; provider: string }> {
  return authedPost("/video/script", { orgId, brandId, ...brief });
}

export interface VoiceoverResult {
  available: boolean;
  base64?: string;
  mimeType?: string;
  provider?: string;
  reason?: string;
}

export async function generateSceneVoiceover(
  orgId: string,
  brandId: string,
  text: string,
  language: "ar" | "en",
): Promise<VoiceoverResult> {
  return authedPost("/video/voiceover", { orgId, brandId, text, language });
}

import type { Language } from "@/lib/ai/types";

export interface VideoScriptBrief {
  objective: string;
  language: Language;
  targetDurationSeconds: number;
  style?: string;
  audienceOverride?: string;
  customInstructions?: string;
}

/** One beat of the video — carries everything that scene needs: the AI's script line, its
 * storyboard image (once generated), and its voiceover clip (once generated). */
export interface VideoProjectScene {
  order: number;
  durationSeconds: number;
  /** Always English — the image-generation prompt for this scene's background. */
  visualDescription: string;
  onScreenText: string;
  voiceoverLine: string;
  imageUrl: string | null;
  voiceoverUrl: string | null;
}

export interface VideoProject {
  id: string;
  brief: VideoScriptBrief;
  title: string;
  logline: string;
  language: Language;
  colorPalette: [string, string];
  scenes: VideoProjectScene[];
  createdBy: string;
}

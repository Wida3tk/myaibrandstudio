export type VideoLanguage = "ar" | "en";

export interface VideoScriptBriefRequest {
  orgId: string;
  brandId: string;
  objective: string;
  language: VideoLanguage;
  targetDurationSeconds: number;
  style?: string;
  audienceOverride?: string;
  customInstructions?: string;
  brandName: string;
  brandVoice: string;
  brandAudience: string;
  brandMemoryFacts: string[];
}

export interface VideoSceneOutput {
  order: number;
  durationSeconds: number;
  visualDescription: string;
  onScreenText: string;
  voiceoverLine: string;
}

export interface VideoScriptOutput {
  title: string;
  logline: string;
  scenes: VideoSceneOutput[];
}

export interface VideoScriptResult {
  script: VideoScriptOutput;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

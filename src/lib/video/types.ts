/**
 * Groundwork only — see docs/13-video-pipeline-architecture.md. No generation, no Worker
 * endpoint, no UI wired to these types yet. A deliberately separate module from
 * src/lib/creative/ (the image pipeline) so video work never has to be threaded through or
 * risk breaking the shipped image/text pipeline.
 */

export type VideoLanguage = "ar" | "en";

/** Step 1 of a future pipeline: brief -> script, mirroring src/lib/creative/types.ts's CreativeBrief. */
export interface VideoScriptBrief {
  objective: string;
  language: VideoLanguage;
  targetDurationSeconds: number;
  style?: string;
  audienceOverride?: string;
  customInstructions?: string;
}

export interface VideoScript {
  title: string;
  logline: string;
  scenes: VideoScene[];
}

/** One beat of the video — the unit a storyboard frame, a voiceover line and a subtitle cue all
 * attach to. */
export interface VideoScene {
  id: string;
  order: number;
  durationSeconds: number;
  visualDescription: string;
  onScreenText?: string;
  voiceoverLine?: string;
}

/** A storyboard frame is a still image per scene — in a real implementation this would reuse the
 * same image-generation gateway src/lib/creative/pipeline.ts already calls (worker POST
 * /creative/image), not a separate provider. */
export interface StoryboardFrame {
  sceneId: string;
  imageUrl: string | null;
  imagePrompt: string;
}

export interface VoiceoverTrack {
  sceneId: string;
  audioUrl: string | null;
  provider: string | null;
}

export interface SubtitleCue {
  sceneId: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/** The eventual Firestore shape — not yet created; no collection, no rules entry, no data.ts.
 * Mirrors the campaigns subcollection shape (see docs/03-data-model.md) so the two pipelines stay
 * structurally consistent. */
export interface VideoProject {
  id: string;
  brief: VideoScriptBrief;
  script: VideoScript | null;
  storyboard: StoryboardFrame[];
  voiceover: VoiceoverTrack[];
  subtitles: SubtitleCue[];
  status: "script" | "storyboard" | "voiceover" | "assembled";
}

import { uploadToCloudinary } from "@/lib/assets/cloudinary";
import { createAsset } from "@/lib/assets/data";
import { base64ToFile } from "@/lib/assets/base64";
import { generateBackgroundImage } from "@/lib/creative/generate";
import { generateSceneVoiceover, generateVideoScript } from "./generate";
import { getAudioDurationSeconds } from "./audio-duration";

/** Scene duration never shrinks to fit a shorter clip — only grows to fit a longer one — so a real
 * voiceover clip is never cut off mid-word. A small buffer absorbs the fade transition
 * (TRANSITION_FRAMES in ShortFormVideo.tsx) landing right on the last syllable. */
const VOICEOVER_DURATION_BUFFER_SECONDS = 0.5;
import type {
  VideoProject,
  VideoProjectScene,
  VideoScriptBrief,
} from "./types";

/** Step 1-3 of the video pipeline: brief -> script -> (best-effort, per scene) a real storyboard
 * image and a real voiceover clip. Mirrors src/lib/creative/pipeline.ts's runCreativeDirector:
 * reuses the existing Cloudinary asset path, never a parallel storage path, and a missing/failed
 * provider degrades that scene to imageUrl/voiceoverUrl: null (the Remotion composition's own
 * documented gradient/silent fallback) rather than faking an asset. */
export async function buildVideoProject(
  orgId: string,
  brandId: string,
  uid: string,
  brief: VideoScriptBrief,
): Promise<Omit<VideoProject, "id">> {
  const { script } = await generateVideoScript(orgId, brandId, brief);

  // Default palette if the brand has none configured — composeLayout's own fallback uses the
  // same pair, kept consistent across the image and video pipelines.
  const colorPalette: [string, string] = ["#1E2440", "#6750D8"];

  const scenes: VideoProjectScene[] = await Promise.all(
    script.scenes.map(async (scene): Promise<VideoProjectScene> => {
      let imageUrl: string | null = null;
      try {
        const image = await generateBackgroundImage(
          orgId,
          brandId,
          scene.visualDescription,
        );
        if (image.available && image.base64 && image.mimeType) {
          const file = base64ToFile(
            image.base64,
            image.mimeType,
            `scene-${scene.order}-bg.jpg`,
          );
          const uploaded = await uploadToCloudinary(file);
          await createAsset(orgId, brandId, uid, {
            url: uploaded.url,
            publicId: uploaded.publicId,
            kind: "image",
          });
          imageUrl = uploaded.url;
        }
      } catch {
        // Falls back to the Remotion composition's own gradient background for this scene.
      }

      let voiceoverUrl: string | null = null;
      let durationSeconds = scene.durationSeconds;
      if (scene.voiceoverLine) {
        try {
          const voice = await generateSceneVoiceover(
            orgId,
            brandId,
            scene.voiceoverLine,
            brief.language,
          );
          if (voice.available && voice.base64 && voice.mimeType) {
            const ext = voice.mimeType.includes("wav") ? "wav" : "mp3";
            const file = base64ToFile(
              voice.base64,
              voice.mimeType,
              `scene-${scene.order}-voiceover.${ext}`,
            );
            try {
              const audioSeconds = await getAudioDurationSeconds(file);
              durationSeconds = Math.max(
                durationSeconds,
                audioSeconds + VOICEOVER_DURATION_BUFFER_SECONDS,
              );
            } catch {
              // Keep the script's own estimate if the browser can't read the clip's duration —
              // the scene still gets its voiceover, just without the fit guarantee.
            }
            // Reuses the same Cloudinary upload path as every other asset, but isn't registered
            // via createAsset: the Asset Library's schema only models "image" | "video" kinds
            // (see src/lib/assets/schema.ts) and its UI has no audio renderer — widening that is
            // its own scoped change, not something to bolt on here. The URL still lives on the
            // video project document itself, so nothing is lost.
            const uploaded = await uploadToCloudinary(file);
            voiceoverUrl = uploaded.url;
          }
        } catch {
          // Falls back to a silent scene (captions still show the line as text).
        }
      }

      return {
        order: scene.order,
        durationSeconds,
        visualDescription: scene.visualDescription,
        onScreenText: scene.onScreenText,
        voiceoverLine: scene.voiceoverLine,
        // No AI video-generation provider exists (see docs/13) — real motion footage only comes
        // from the Video Studio page's per-scene "upload a real video" path.
        videoUrl: null,
        imageUrl,
        voiceoverUrl,
      };
    }),
  );

  return {
    brief,
    title: script.title,
    logline: script.logline,
    language: brief.language,
    colorPalette,
    scenes,
    createdBy: uid,
  };
}

/**
 * Deliberately hand-duplicated from src/lib/video/types.ts (the app's own groundwork types) rather
 * than imported — this is a genuinely separate pipeline (its own bundler, its own render process,
 * never bundled into the Next.js app), same reasoning as src/lib/ai/types.ts mirroring the Worker's
 * types instead of sharing a package across runtimes.
 */
export type RenderScene = {
  order: number;
  durationInFrames: number;
  /** Cloudinary (or any public HTTPS) URL for a real video clip for this scene. Takes priority over
   * imageUrl when set — real motion footage, not a panned still. Null = no clip provided. */
  videoUrl: string | null;
  /** Cloudinary (or any public HTTPS) URL for the storyboard frame. Null = no image provider was
   * configured/available — renders a brand-colored gradient instead of faking an image. Ignored
   * when videoUrl is set. */
  imageUrl: string | null;
  onScreenText: string;
  /** Spoken line for this scene, shown as a caption — and as the <Audio> track whenever
   * voiceoverUrl is set (null when no provider was configured/available for this scene; see
   * docs/13-video-pipeline-architecture.md). */
  voiceoverLine: string;
  voiceoverUrl: string | null;
};

// `type`, not `interface` — Remotion's <Composition> and renderMedia() constrain props to
// Record<string, unknown>, which an interface doesn't structurally satisfy the same way a type
// alias does; this must stay a type alias or typecheck fails at every Remotion API boundary.
export type ShortFormVideoProps = {
  title: string;
  language: "ar" | "en";
  colorPalette: [string, string];
  scenes: RenderScene[];
  /** The brand's logo (Cloudinary/any public HTTPS URL), shown as a small persistent watermark.
   * Null = no brand logo configured — renders with no overlay rather than faking a mark. */
  logoUrl: string | null;
};

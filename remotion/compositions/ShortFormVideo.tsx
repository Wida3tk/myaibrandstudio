import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Series,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderScene, ShortFormVideoProps } from "../types";

/** Fades each scene in/out of black at its own boundaries — a real crossfade needs overlapping
 * sequences, which `Series` doesn't give us without a lot of extra bookkeeping; fading each
 * scene's own content to/from black at the cut reads as an intentional transition rather than a
 * hard cut, for a fraction of the complexity. */
const TRANSITION_FRAMES = 10;

function useSceneTransitionOpacity(durationInFrames: number): number {
  const frame = useCurrentFrame();
  const fadeFrames = Math.min(
    TRANSITION_FRAMES,
    Math.floor(durationInFrames / 4),
  );
  return interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

/** Real video clip when the scene has one (actual motion, not a panned still) — falls back to a
 * Ken-Burns-panned image, then a brand-colored gradient. A slow, constant zoom (never past 1.12x,
 * so it never reveals an image's edge) is layered on all three for a consistent feel; on video it
 * reads as a subtle push-in over real footage rather than the only source of motion. */
function SceneBackground({
  scene,
  colorPalette,
}: {
  scene: RenderScene;
  colorPalette: [string, string];
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, scene.durationInFrames], [1, 1.12], {
    extrapolateRight: "clamp",
  });

  if (scene.videoUrl) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={scene.videoUrl}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (!scene.imageUrl) {
    // No image or video provided for this scene — a brand-colored gradient, never a faked image.
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${colorPalette[0]}, ${colorPalette[1]})`,
          transform: `scale(${scale})`,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={scene.imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
}

function SceneCaption({
  scene,
  language,
}: {
  scene: RenderScene;
  language: "ar" | "en";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      dir={language === "ar" ? "rtl" : "ltr"}
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 140,
        paddingInline: 64,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))",
        }}
      />
      {scene.onScreenText && (
        <div
          style={{
            color: "#fff",
            fontFamily:
              language === "ar"
                ? "'Noto Sans Arabic', sans-serif"
                : "Geist, sans-serif",
            fontWeight: 700,
            fontSize: 72,
            textAlign: "center",
            opacity: enter,
            transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
          }}
        >
          {scene.onScreenText}
        </div>
      )}
      {scene.voiceoverLine && (
        <div
          style={{
            color: "rgba(255,255,255,0.85)",
            fontFamily:
              language === "ar"
                ? "'Noto Sans Arabic', sans-serif"
                : "Geist, sans-serif",
            fontSize: 36,
            textAlign: "center",
            marginTop: 16,
            opacity: enter,
          }}
        >
          {scene.voiceoverLine}
        </div>
      )}
    </AbsoluteFill>
  );
}

function SceneContent({
  scene,
  colorPalette,
  language,
}: {
  scene: RenderScene;
  colorPalette: [string, string];
  language: "ar" | "en";
}) {
  const opacity = useSceneTransitionOpacity(scene.durationInFrames);
  return (
    <AbsoluteFill style={{ opacity }}>
      <SceneBackground scene={scene} colorPalette={colorPalette} />
      <SceneCaption scene={scene} language={language} />
      {scene.voiceoverUrl && <Audio src={scene.voiceoverUrl} />}
    </AbsoluteFill>
  );
}

/** A small, persistent watermark — not per-scene, so it doesn't fade with the scene transitions.
 * Positioned opposite the caption's reading direction corner so it never collides with RTL/LTR
 * on-screen text. */
function BrandLogo({
  logoUrl,
  language,
}: {
  logoUrl: string;
  language: "ar" | "en";
}) {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: language === "ar" ? "flex-start" : "flex-end",
        padding: 48,
      }}
    >
      <Img
        src={logoUrl}
        style={{
          height: 72,
          maxWidth: 220,
          objectFit: "contain",
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
        }}
      />
    </AbsoluteFill>
  );
}

export function ShortFormVideo({
  scenes,
  colorPalette,
  language,
  logoUrl,
}: ShortFormVideoProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence
            key={scene.order}
            durationInFrames={scene.durationInFrames}
          >
            <SceneContent
              scene={scene}
              colorPalette={colorPalette}
              language={language}
            />
          </Series.Sequence>
        ))}
      </Series>
      {logoUrl && <BrandLogo logoUrl={logoUrl} language={language} />}
    </AbsoluteFill>
  );
}

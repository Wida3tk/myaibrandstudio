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
import { loadFont as loadArabicFont } from "@remotion/google-fonts/Cairo";
import { loadFont as loadLatinFont } from "@remotion/google-fonts/Montserrat";
import type { RenderScene, ShortFormVideoProps } from "../types";

// Real, licensed Google Fonts fetched at render time — not a CSS font-family name hoping a
// matching font happens to be installed on whatever machine runs the headless Chromium. Cairo for
// Arabic and Montserrat for Latin are both built for this kind of bold, high-contrast caption use.
const { fontFamily: ARABIC_FONT } = loadArabicFont("normal", {
  weights: ["600", "700", "800"],
  subsets: ["arabic"],
});
const { fontFamily: LATIN_FONT } = loadLatinFont("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

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
  // Headline leads; the subtitle trails a few frames behind it for a light stagger rather than
  // both snapping in at once. Lower damping than the old config so it settles with a touch of
  // life instead of landing dead-flat.
  const headlineEnter = spring({
    frame,
    fps,
    config: { damping: 18, mass: 0.6 },
  });
  const subtitleEnter = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 18, mass: 0.6 },
  });
  const fontFamily = language === "ar" ? ARABIC_FONT : LATIN_FONT;

  return (
    <AbsoluteFill
      dir={language === "ar" ? "rtl" : "ltr"}
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 150,
        paddingInline: 72,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.15) 55%, rgba(0,0,0,0))",
        }}
      />
      {scene.onScreenText && (
        <div
          style={{
            color: "#fff",
            fontFamily,
            fontWeight: 800,
            fontSize: 76,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            textAlign: "center",
            textShadow: "0 2px 24px rgba(0,0,0,0.45)",
            opacity: headlineEnter,
            transform: `translateY(${interpolate(headlineEnter, [0, 1], [28, 0])}px) scale(${interpolate(headlineEnter, [0, 1], [0.94, 1])})`,
          }}
        >
          {scene.onScreenText}
        </div>
      )}
      {scene.voiceoverLine && (
        <div
          style={{
            color: "rgba(255,255,255,0.88)",
            fontFamily,
            fontWeight: 600,
            fontSize: 34,
            lineHeight: 1.4,
            letterSpacing: "0.01em",
            textAlign: "center",
            textShadow: "0 1px 12px rgba(0,0,0,0.5)",
            marginTop: 18,
            opacity: subtitleEnter,
            transform: `translateY(${interpolate(subtitleEnter, [0, 1], [16, 0])}px)`,
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

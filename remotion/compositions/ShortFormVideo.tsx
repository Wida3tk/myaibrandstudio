import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Series,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderScene, ShortFormVideoProps } from "../types";

/** Slow, constant Ken Burns zoom over the scene's own duration — never past 1.12x, so it never
 * reveals the image's edge regardless of the scene length. */
function KenBurnsBackground({
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

  if (!scene.imageUrl) {
    // No image provider configured/available for this scene — a brand-colored gradient, never a
    // faked image.
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

export function ShortFormVideo({
  scenes,
  colorPalette,
  language,
}: ShortFormVideoProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence
            key={scene.order}
            durationInFrames={scene.durationInFrames}
          >
            <KenBurnsBackground scene={scene} colorPalette={colorPalette} />
            <SceneCaption scene={scene} language={language} />
            {scene.voiceoverUrl && <Audio src={scene.voiceoverUrl} />}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}

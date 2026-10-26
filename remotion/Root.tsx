import React from "react";
import { Composition } from "remotion";
import { ShortFormVideo } from "./compositions/ShortFormVideo";
import type { ShortFormVideoProps } from "./types";
import { exampleProps } from "./example-props";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920; // vertical, short-form (Reels/TikTok/Shorts)

export function RemotionRoot() {
  return (
    <Composition
      id="ShortFormVideo"
      component={ShortFormVideo}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={exampleProps.scenes.reduce(
        (sum, s) => sum + s.durationInFrames,
        0,
      )}
      defaultProps={exampleProps}
      calculateMetadata={async ({ props }) => {
        const typed = props as ShortFormVideoProps;
        const durationInFrames = Math.max(
          1,
          typed.scenes.reduce((sum, s) => sum + s.durationInFrames, 0),
        );
        return { durationInFrames };
      }}
    />
  );
}

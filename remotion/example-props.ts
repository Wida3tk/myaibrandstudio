import type { ShortFormVideoProps } from "./types";

const FPS = 30;

/** Default Studio-preview props and the fixture the render smoke test uses. No imageUrl/
 * voiceoverUrl on any scene — this sandbox has no live provider credentials to generate real
 * ones (see docs/13-video-pipeline-architecture.md), so this exercises the real gradient-background +
 * silent-video fallback path end to end rather than faking AI output. */
export const exampleProps: ShortFormVideoProps = {
  title: "Weekend Upskill",
  language: "en",
  colorPalette: ["#1E2440", "#6750D8"],
  logoUrl: null,
  scenes: [
    {
      order: 1,
      durationInFrames: 3 * FPS,
      videoUrl: null,
      imageUrl: null,
      onScreenText: "Ready to level up?",
      voiceoverLine: "Ready to level up your weekend?",
      voiceoverUrl: null,
    },
    {
      order: 2,
      durationInFrames: 4 * FPS,
      videoUrl: null,
      imageUrl: null,
      onScreenText: "Join 500+ learners",
      voiceoverLine: "Join hundreds of learners in our weekend course.",
      voiceoverUrl: null,
    },
    {
      order: 3,
      durationInFrames: 3 * FPS,
      videoUrl: null,
      imageUrl: null,
      onScreenText: "Enroll today",
      voiceoverLine: "Enroll today and start your journey.",
      voiceoverUrl: null,
    },
  ],
};

/** Same fixture in Arabic, to prove RTL rendering — used by the QA render pass, not the Studio default. */
export const examplePropsArabic: ShortFormVideoProps = {
  title: "طوّر مسيرتك",
  language: "ar",
  colorPalette: ["#1E2440", "#6750D8"],
  logoUrl: null,
  scenes: [
    {
      order: 1,
      durationInFrames: 3 * FPS,
      videoUrl: null,
      imageUrl: null,
      onScreenText: "هل أنت مستعد للتطور؟",
      voiceoverLine: "هل أنت مستعد لتطوير مسيرتك في نهاية الأسبوع؟",
      voiceoverUrl: null,
    },
    {
      order: 2,
      durationInFrames: 4 * FPS,
      videoUrl: null,
      imageUrl: null,
      onScreenText: "+٥٠٠ متدرب",
      voiceoverLine: "انضم إلى مئات المتدربين في دورتنا الأسبوعية.",
      voiceoverUrl: null,
    },
    {
      order: 3,
      durationInFrames: 3 * FPS,
      videoUrl: null,
      imageUrl: null,
      onScreenText: "سجّل الآن",
      voiceoverLine: "سجّل اليوم وابدأ رحلتك.",
      voiceoverUrl: null,
    },
  ],
};

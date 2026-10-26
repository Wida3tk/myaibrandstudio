import { describe, expect, it } from "vitest";
import { videoScriptRequestSchema, videoScriptSchema } from "./schema.js";

describe("videoScriptRequestSchema", () => {
  it("accepts a minimal valid brief", () => {
    const result = videoScriptRequestSchema.safeParse({
      orgId: "org1",
      brandId: "brand1",
      objective: "Promote a weekend course",
      language: "en",
      targetDurationSeconds: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a target duration outside the allowed range", () => {
    const result = videoScriptRequestSchema.safeParse({
      orgId: "org1",
      brandId: "brand1",
      objective: "x",
      language: "en",
      targetDurationSeconds: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("videoScriptSchema", () => {
  const valid = {
    title: "Weekend Upskill",
    logline: "A short promo for a weekend training course.",
    scenes: [
      {
        order: 1,
        durationSeconds: 4,
        visualDescription:
          "A warm, softly lit desk with a laptop, editorial photography",
        onScreenText: "New course",
        voiceoverLine: "Ready to level up your weekend?",
      },
      {
        order: 2,
        durationSeconds: 5,
        visualDescription:
          "A group of professionals collaborating in a bright office",
        onScreenText: "Enroll now",
        voiceoverLine: "Join hundreds of learners this weekend.",
      },
    ],
  };

  it("accepts a well-formed script", () => {
    expect(videoScriptSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects fewer than 2 scenes", () => {
    const result = videoScriptSchema.safeParse({
      ...valid,
      scenes: [valid.scenes[0]],
    });
    expect(result.success).toBe(false);
  });

  it("defaults onScreenText and voiceoverLine when omitted", () => {
    const scene = { order: 1, durationSeconds: 4, visualDescription: "x" };
    const result = videoScriptSchema.safeParse({
      ...valid,
      scenes: [scene, scene],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scenes[0].onScreenText).toBe("");
      expect(result.data.scenes[0].voiceoverLine).toBe("");
    }
  });
});

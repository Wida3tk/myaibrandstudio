import { describe, expect, it } from "vitest";
import { buildVideoScriptPrompt } from "./prompt.js";
import type { VideoScriptBriefRequest } from "./types.js";

const base: VideoScriptBriefRequest = {
  orgId: "org1",
  brandId: "brand1",
  objective: "Promote a weekend training course",
  language: "en",
  targetDurationSeconds: 30,
  brandName: "Acme Academy",
  brandVoice: "warm and encouraging",
  brandAudience: "young professionals",
  brandMemoryFacts: ["Never use emoji"],
};

describe("buildVideoScriptPrompt", () => {
  it("instructs Arabic copy for language: ar but always-English visual descriptions", () => {
    const { system } = buildVideoScriptPrompt({ ...base, language: "ar" });
    expect(system).toContain("Arabic");
    expect(system).toContain(
      "visualDescription must ALWAYS be written in English",
    );
  });

  it("forbids rendered text/logos in the visual description", () => {
    const { system } = buildVideoScriptPrompt(base);
    expect(system).toMatch(/never ask it to render any text/i);
  });

  it("includes brand context, objective and target duration in the user prompt", () => {
    const { user } = buildVideoScriptPrompt(base);
    expect(user).toContain("Acme Academy");
    expect(user).toContain("warm and encouraging");
    expect(user).toContain("young professionals");
    expect(user).toContain("Never use emoji");
    expect(user).toContain("Promote a weekend training course");
    expect(user).toContain("30 seconds");
  });
});

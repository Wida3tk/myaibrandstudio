import { describe, expect, it } from "vitest";
import { buildCreativePrompt } from "./prompt.js";
import type { CreativeBriefRequest } from "./types.js";

const base: CreativeBriefRequest = {
  orgId: "org1",
  brandId: "brand1",
  objective: "Promote a weekend training course",
  platform: "ig-post",
  language: "en",
  width: 1080,
  height: 1080,
  brandName: "Acme Academy",
  brandVoice: "warm and encouraging",
  brandAudience: "young professionals",
  brandMemoryFacts: ["Never use emoji"],
  brandPrimaryColor: "#6750D8",
  brandHasLogo: true,
};

describe("buildCreativePrompt", () => {
  it("instructs Arabic copy for language: ar but always-English image prompts", () => {
    const { system } = buildCreativePrompt({ ...base, language: "ar" });
    expect(system).toContain("Arabic");
    expect(system).toContain("imagePrompts must ALWAYS be written in English");
  });

  it("forbids text/logos baked into the generated image", () => {
    const { system } = buildCreativePrompt(base);
    expect(system).toMatch(/never ask for any text/i);
  });

  it("includes brand context, objective and platform size in the user prompt", () => {
    const { user } = buildCreativePrompt(base);
    expect(user).toContain("Acme Academy");
    expect(user).toContain("warm and encouraging");
    expect(user).toContain("young professionals");
    expect(user).toContain("Never use emoji");
    expect(user).toContain("#6750D8");
    expect(user).toContain("leave clear space for it");
    expect(user).toContain("Promote a weekend training course");
    expect(user).toContain("1080x1080");
  });

  it("says no logo is available when the brand has none", () => {
    const { user } = buildCreativePrompt({ ...base, brandHasLogo: false });
    expect(user).toContain("Logo available: no");
  });

  it("includes requiredText and style when given", () => {
    const { user } = buildCreativePrompt({
      ...base,
      style: "premium editorial",
      requiredText: "Starts March 1st",
    });
    expect(user).toContain("premium editorial");
    expect(user).toContain("Starts March 1st");
  });
});

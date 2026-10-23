import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt.js";
import type { GenerationRequest } from "./types.js";

const base: GenerationRequest = {
  orgId: "org1",
  brandId: "brand1",
  contentType: "post",
  language: "en",
  brandVoice: "warm and playful",
  brandAudience: "young professionals",
  brandMemoryFacts: ["Never use emoji"],
  topic: "Ramadan campaign",
};

describe("buildPrompt", () => {
  it("instructs Arabic output for language: ar", () => {
    const { system } = buildPrompt({ ...base, language: "ar" });
    expect(system).toContain("Arabic");
  });

  it("instructs English output for language: en", () => {
    const { system } = buildPrompt({ ...base, language: "en" });
    expect(system).toContain("English");
  });

  it("includes brand voice, audience and memory facts in the user prompt", () => {
    const { user } = buildPrompt(base);
    expect(user).toContain("warm and playful");
    expect(user).toContain("young professionals");
    expect(user).toContain("Never use emoji");
    expect(user).toContain("Ramadan campaign");
  });

  it("omits the memory-facts line when there are none", () => {
    const { user } = buildPrompt({ ...base, brandMemoryFacts: [] });
    expect(user).not.toContain("Brand rules");
  });
});

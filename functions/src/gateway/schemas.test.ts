import { describe, expect, it } from "vitest";
import { generatedContentSchema } from "./schemas.js";

describe("generatedContentSchema", () => {
  it("accepts a well-formed response", () => {
    const result = generatedContentSchema.safeParse({
      hook: "Big news",
      caption: "We just launched our new blend.",
      hashtags: ["coffee", "launch"],
      callToAction: "Order now",
    });
    expect(result.success).toBe(true);
  });

  it("defaults hashtags and callToAction when omitted", () => {
    const result = generatedContentSchema.safeParse({
      hook: "Big news",
      caption: "We just launched our new blend.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hashtags).toEqual([]);
      expect(result.data.callToAction).toBe("");
    }
  });

  it("rejects a response missing the caption", () => {
    const result = generatedContentSchema.safeParse({ hook: "Big news" });
    expect(result.success).toBe(false);
  });
});

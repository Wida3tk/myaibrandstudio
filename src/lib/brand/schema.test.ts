import { describe, expect, it } from "vitest";
import { brandProfileSchema } from "./schema";

describe("brandProfileSchema", () => {
  it("rejects a missing name", () => {
    const result = brandProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("defaults optional arrays to empty and trims strings", () => {
    const result = brandProfileSchema.safeParse({ name: "  Acme  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme");
      expect(result.data.objectives).toEqual([]);
      expect(result.data.memoryFacts).toEqual([]);
    }
  });

  it("accepts a full profile", () => {
    const result = brandProfileSchema.safeParse({
      name: "Acme",
      voiceTone: "Friendly",
      audienceDescription: "Young professionals",
      objectives: ["Grow awareness"],
      memoryFacts: ["Never use emoji"],
    });
    expect(result.success).toBe(true);
  });
});

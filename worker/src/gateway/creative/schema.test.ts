import { describe, expect, it } from "vitest";
import { creativeBriefRequestSchema, creativeSpecSchema } from "./schema.js";

describe("creativeBriefRequestSchema", () => {
  const base = {
    orgId: "org1",
    brandId: "brand1",
    objective: "Promote a new course",
    platform: "ig-post",
    language: "en",
    width: 1080,
    height: 1080,
  };

  it("accepts a minimal valid brief", () => {
    expect(creativeBriefRequestSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an unknown platform id", () => {
    const result = creativeBriefRequestSchema.safeParse({
      ...base,
      platform: "facebook-cover",
    });
    expect(result.success).toBe(false);
  });
});

describe("creativeSpecSchema", () => {
  const valid = {
    campaignConcept: "Bold launch",
    headline: "New course, new you",
    supportingCopy: "Enroll today and transform your career.",
    cta: "Enroll now",
    visualDirection: "Warm, premium editorial photography",
    colorPalette: ["#6750D8", "#F8F6F2"],
    imagePrompts: ["A warm, softly lit desk with a laptop and coffee, editorial photography"],
    layoutComposition: "Full-bleed background, headline lower third, logo top-right",
    typographyHierarchy: { headline: "bold, large", body: "regular, medium", cta: "bold, pill button" },
    platformDimensions: { width: 1080, height: 1080 },
    brandConstraints: ["Always show the logo"],
  };

  it("accepts a well-formed spec", () => {
    expect(creativeSpecSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-hex color in the palette", () => {
    const result = creativeSpecSchema.safeParse({
      ...valid,
      colorPalette: ["purple"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 palette colors", () => {
    const result = creativeSpecSchema.safeParse({
      ...valid,
      colorPalette: ["#6750D8"],
    });
    expect(result.success).toBe(false);
  });

  it("defaults brandConstraints when omitted", () => {
    const rest: Partial<typeof valid> = { ...valid };
    delete rest.brandConstraints;
    const result = creativeSpecSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brandConstraints).toEqual([]);
    }
  });

  it("rejects a response missing the headline", () => {
    const rest: Partial<typeof valid> = { ...valid };
    delete rest.headline;
    expect(creativeSpecSchema.safeParse(rest).success).toBe(false);
  });
});

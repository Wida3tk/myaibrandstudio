import { describe, expect, it } from "vitest";
import { composeLayout, type ComposeInput } from "./compose";
import { LAYOUT_VARIANTS } from "@/lib/creative/types";

const baseSpec: ComposeInput["spec"] = {
  campaignConcept: "Bold launch",
  headline: "New course, new you",
  supportingCopy: "Enroll today and transform your career.",
  cta: "Enroll now",
  visualDirection: "Warm, premium editorial photography",
  colorPalette: ["#6750D8", "#F8F6F2"],
  imagePrompts: ["A warm, softly lit desk with a laptop and coffee"],
  layoutComposition: "Full-bleed background, headline lower third",
  typographyHierarchy: { headline: "bold", body: "regular", cta: "bold pill" },
  platformDimensions: { width: 1080, height: 1080 },
  brandConstraints: ["Always show the logo"],
};

function baseInput(overrides: Partial<ComposeInput> = {}): ComposeInput {
  return {
    spec: baseSpec,
    width: 1080,
    height: 1080,
    language: "en",
    backgroundImageUrl: null,
    logoUrl: "",
    ...overrides,
  };
}

describe("composeLayout", () => {
  it("produces a non-empty, in-bounds composition for every variant", () => {
    for (const variant of LAYOUT_VARIANTS) {
      const specs = composeLayout(variant, baseInput());
      expect(specs.length).toBeGreaterThan(0);
      for (const spec of specs) {
        expect(spec.left).toBeGreaterThanOrEqual(0);
        expect(spec.top).toBeGreaterThanOrEqual(0);
        expect(spec.left + spec.width).toBeLessThanOrEqual(1080 + 1);
      }
    }
  });

  it("includes a background image object when a background URL is given", () => {
    const specs = composeLayout(
      "editorial",
      baseInput({ backgroundImageUrl: "https://example.com/bg.jpg" }),
    );
    const background = specs.find((s) => s.role === "background");
    expect(background?.type).toBe("image");
  });

  it("falls back to a gradient when no background image is available", () => {
    const specs = composeLayout("editorial", baseInput());
    const background = specs.find((s) => s.role === "background");
    expect(background?.type).toBe("gradient");
  });

  it("includes a logo object only when a logo URL is given", () => {
    const withLogo = composeLayout(
      "bold",
      baseInput({ logoUrl: "https://example.com/logo.png" }),
    );
    const withoutLogo = composeLayout("bold", baseInput());
    expect(withLogo.some((s) => s.role === "logo")).toBe(true);
    expect(withoutLogo.some((s) => s.role === "logo")).toBe(false);
  });

  it("uses the exact headline/copy/cta text from the spec, verbatim", () => {
    for (const variant of LAYOUT_VARIANTS) {
      const specs = composeLayout(variant, baseInput());
      const headline = specs.find((s) => s.role === "headline");
      const cta = specs.find((s) => s.role === "cta");
      expect(headline?.type).toBe("textbox");
      expect(cta?.type).toBe("textbox");
      if (headline?.type === "textbox")
        expect(headline.text).toContain(baseSpec.headline);
      if (cta?.type === "textbox") expect(cta.text).toContain(baseSpec.cta);
    }
  });

  it("switches text direction and alignment to rtl for Arabic", () => {
    const specs = composeLayout("minimal", baseInput({ language: "ar" }));
    const headline = specs.find((s) => s.role === "headline");
    expect(headline?.type).toBe("textbox");
    if (headline?.type === "textbox") {
      expect(headline.direction).toBe("rtl");
      expect(headline.textAlign).toBe("right");
    }
  });

  it("produces three distinct compositions, not just a palette swap", () => {
    const roleSets = LAYOUT_VARIANTS.map(
      (variant) =>
        new Set(composeLayout(variant, baseInput()).map((s) => s.role)),
    );
    const [editorial, bold, minimal] = roleSets;
    expect(editorial).not.toEqual(bold);
    expect(bold).not.toEqual(minimal);
    expect(editorial).not.toEqual(minimal);
  });
});

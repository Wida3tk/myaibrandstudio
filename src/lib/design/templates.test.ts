import { describe, expect, it } from "vitest";
import { TEMPLATES, getTemplate } from "./templates";

describe("TEMPLATES", () => {
  it("has unique ids and a blank template with no objects", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getTemplate("blank").build(1000, 1000)).toEqual([]);
  });

  it("builds every non-blank template's objects within canvas bounds", () => {
    const width = 1080;
    const height = 1080;
    for (const template of TEMPLATES) {
      for (const spec of template.build(width, height)) {
        expect(spec.left).toBeGreaterThanOrEqual(0);
        expect(spec.top).toBeGreaterThanOrEqual(0);
        expect(spec.left).toBeLessThanOrEqual(width);
        expect(spec.top).toBeLessThanOrEqual(height);
      }
    }
  });
});

describe("getTemplate", () => {
  it("falls back to the first template for an unknown id", () => {
    expect(getTemplate("nonexistent")).toBe(TEMPLATES[0]);
  });
});

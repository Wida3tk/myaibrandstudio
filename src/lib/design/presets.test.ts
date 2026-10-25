import { describe, expect, it } from "vitest";
import { FORMAT_PRESETS, getPreset } from "./presets";

describe("FORMAT_PRESETS", () => {
  it("has unique ids and positive dimensions", () => {
    const ids = FORMAT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of FORMAT_PRESETS) {
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
    }
  });
});

describe("getPreset", () => {
  it("returns the matching preset", () => {
    expect(getPreset("ig-story").height).toBe(1920);
  });

  it("falls back to the first preset for an unknown id", () => {
    expect(getPreset("nonexistent")).toBe(FORMAT_PRESETS[0]);
  });
});

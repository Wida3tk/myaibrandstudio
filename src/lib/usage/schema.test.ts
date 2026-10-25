import { describe, expect, it } from "vitest";
import { yyyymm } from "./schema";

describe("yyyymm", () => {
  it("formats year and zero-padded month with no separator", () => {
    expect(yyyymm(new Date(2026, 9, 25))).toBe("202610");
  });

  it("pads single-digit months", () => {
    expect(yyyymm(new Date(2026, 0, 1))).toBe("202601");
  });
});

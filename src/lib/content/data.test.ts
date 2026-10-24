import { describe, expect, it } from "vitest";
import { nextStatus } from "./data";

describe("nextStatus", () => {
  it("draft moves to in_review", () => {
    expect(nextStatus("draft")).toBe("in_review");
  });

  it("in_review moves to approved", () => {
    expect(nextStatus("in_review")).toBe("approved");
  });

  it("approved is terminal", () => {
    expect(nextStatus("approved")).toBeNull();
  });
});

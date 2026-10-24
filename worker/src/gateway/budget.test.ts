import { describe, expect, it } from "vitest";
import { isWithinBudget } from "./budget.js";

describe("isWithinBudget", () => {
  it("allows a request when usage is below the limit", () => {
    expect(
      isWithinBudget({ tokensUsedToday: 100 }, { dailyTokenLimit: 1000 }),
    ).toBe(true);
  });

  it("refuses a request once usage reaches the limit", () => {
    expect(
      isWithinBudget({ tokensUsedToday: 1000 }, { dailyTokenLimit: 1000 }),
    ).toBe(false);
  });

  it("refuses a request that already exceeds the limit", () => {
    expect(
      isWithinBudget({ tokensUsedToday: 1500 }, { dailyTokenLimit: 1000 }),
    ).toBe(false);
  });
});

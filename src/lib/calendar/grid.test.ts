import { describe, expect, it } from "vitest";
import { getMonthGridDays, getWeekDays, toDateKey } from "./grid";

describe("toDateKey", () => {
  it("formats as YYYY-MM-DD with zero-padding", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("getMonthGridDays", () => {
  it("covers every day of the month and is a multiple of 7", () => {
    const days = getMonthGridDays(2026, 1); // February 2026
    expect(days.length % 7).toBe(0);
    const keys = days.map(toDateKey);
    expect(keys).toContain("2026-02-01");
    expect(keys).toContain("2026-02-28");
  });

  it("starts the grid on a Sunday and ends on a Saturday", () => {
    const days = getMonthGridDays(2026, 1);
    expect(days[0].getDay()).toBe(0);
    expect(days[days.length - 1].getDay()).toBe(6);
  });
});

describe("getWeekDays", () => {
  it("returns 7 consecutive days starting on Sunday", () => {
    const days = getWeekDays(new Date(2026, 1, 11)); // a Wednesday
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(0);
    expect(toDateKey(days[3])).toBe("2026-02-11");
  });
});

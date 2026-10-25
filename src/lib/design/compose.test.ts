import { describe, expect, it } from "vitest";
import { wrapText } from "./compose";

// 10px per character — deterministic stand-in for ctx.measureText().width
const measure = (s: string) => s.length * 10;

describe("wrapText", () => {
  it("returns a single line when the text fits", () => {
    expect(wrapText(measure, "short text", 200)).toEqual(["short text"]);
  });

  it("wraps onto multiple lines when text exceeds maxWidth", () => {
    // "one two three four" = 19 chars * 10 = 190px; maxWidth 100 forces wrapping.
    // "one two three" (13 chars = 130px) doesn't fit, so it breaks after "one two" (70px);
    // "three four" (10 chars = 100px) fits exactly (the check is strictly ">").
    expect(wrapText(measure, "one two three four", 100)).toEqual([
      "one two",
      "three four",
    ]);
  });

  it("never drops a word even if it alone exceeds maxWidth", () => {
    expect(
      wrapText(measure, "a supercalifragilisticexpialidocious word", 50),
    ).toEqual(["a", "supercalifragilisticexpialidocious", "word"]);
  });

  it("returns an empty array for blank input", () => {
    expect(wrapText(measure, "   ", 100)).toEqual([]);
  });

  it("collapses repeated whitespace between words", () => {
    expect(wrapText(measure, "a   b", 1000)).toEqual(["a b"]);
  });
});

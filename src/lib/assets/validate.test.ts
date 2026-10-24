import { describe, expect, it } from "vitest";
import { assetKindFromMimeType, validateAssetFile } from "./validate";

describe("validateAssetFile", () => {
  it("accepts a normal image", () => {
    expect(validateAssetFile({ type: "image/png", size: 1024 })).toBeNull();
  });

  it("accepts a normal video", () => {
    expect(
      validateAssetFile({ type: "video/mp4", size: 1024 * 1024 }),
    ).toBeNull();
  });

  it("rejects a disallowed file type", () => {
    expect(validateAssetFile({ type: "application/pdf", size: 1024 })).toMatch(
      /image or video/,
    );
  });

  it("rejects a file over the size limit", () => {
    expect(
      validateAssetFile({ type: "image/png", size: 21 * 1024 * 1024 }),
    ).toMatch(/too large/);
  });
});

describe("assetKindFromMimeType", () => {
  it("classifies image mime types", () => {
    expect(assetKindFromMimeType("image/jpeg")).toBe("image");
  });

  it("classifies video mime types", () => {
    expect(assetKindFromMimeType("video/quicktime")).toBe("video");
  });
});

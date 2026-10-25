import { describe, expect, it, vi } from "vitest";
import { canvasToFile } from "./export";

describe("canvasToFile", () => {
  it("resolves a PNG File from the canvas's blob", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = vi.fn((cb) => cb(new Blob(["x"], { type: "image/png" })));

    const file = await canvasToFile(canvas, "design.png");

    expect(file.name).toBe("design.png");
    expect(file.type).toBe("image/png");
  });

  it("rejects when the canvas can't produce a blob", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = vi.fn((cb) => cb(null));

    await expect(canvasToFile(canvas, "design.png")).rejects.toThrow();
  });
});

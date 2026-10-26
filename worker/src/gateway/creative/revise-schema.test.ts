import { describe, expect, it } from "vitest";
import { reviseRequestSchema, reviseResponseSchema } from "./revise-schema.js";

describe("reviseRequestSchema", () => {
  it("accepts a minimal valid request", () => {
    const result = reviseRequestSchema.safeParse({
      orgId: "org1",
      brandId: "brand1",
      instruction: "make the headline bigger",
      language: "en",
      canvasWidth: 1080,
      canvasHeight: 1080,
      objects: [
        {
          role: "headline",
          type: "textbox",
          text: "Hello",
          left: 0,
          top: 0,
          width: 100,
          height: 40,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("reviseResponseSchema", () => {
  it("accepts ops using only allowed props", () => {
    const result = reviseResponseSchema.safeParse({
      ops: [{ role: "headline", action: "set", props: { fontSize: 80 } }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an op with a prop outside the allowlist", () => {
    const result = reviseResponseSchema.safeParse({
      ops: [
        {
          role: "headline",
          action: "set",
          props: { src: "https://evil.example/x.js" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("defaults ops to an empty array when omitted", () => {
    const result = reviseResponseSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ops).toEqual([]);
    }
  });
});

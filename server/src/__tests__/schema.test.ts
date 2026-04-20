import { describe, expect, it } from "vitest";
import { fragranceInputSchema, fragranceUpdateSchema } from "../schema";

describe("fragranceInputSchema", () => {
  it("accepts valid trimmed fields", () => {
    const result = fragranceInputSchema.safeParse({
      name: "Lavender",
      description: "Calming blend",
      category: "Floral",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Lavender",
        description: "Calming blend",
        category: "Floral",
      });
    }
  });

  it("trims whitespace", () => {
    const result = fragranceInputSchema.safeParse({
      name: "  Rose  ",
      description: "  Bold  ",
      category: "  Floral  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Rose");
      expect(result.data.description).toBe("Bold");
      expect(result.data.category).toBe("Floral");
    }
  });

  it("rejects empty name after trim", () => {
    const result = fragranceInputSchema.safeParse({
      name: "   ",
      description: "x",
      category: "y",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing field", () => {
    const result = fragranceInputSchema.safeParse({
      name: "x",
      description: "y",
    });
    expect(result.success).toBe(false);
  });
});

describe("fragranceUpdateSchema", () => {
  it("accepts partial update with one field", () => {
    const result = fragranceUpdateSchema.safeParse({ name: "New" });
    expect(result.success).toBe(true);
  });

  it("accepts multiple fields", () => {
    const result = fragranceUpdateSchema.safeParse({
      name: "A",
      category: "B",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = fragranceUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("At least one"))).toBe(true);
    }
  });
});

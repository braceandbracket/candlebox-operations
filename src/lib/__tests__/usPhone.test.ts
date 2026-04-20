import { describe, expect, it } from "vitest";
import { digitsOnly, formatUsPhoneMask, national10Digits } from "../usPhone";

describe("digitsOnly", () => {
  it("strips non-digits", () => {
    expect(digitsOnly("(555) 123-4567")).toBe("5551234567");
  });

  it("returns empty string when no digits", () => {
    expect(digitsOnly("abc")).toBe("");
  });

  it("handles empty string", () => {
    expect(digitsOnly("")).toBe("");
  });
});

describe("formatUsPhoneMask", () => {
  it("returns digits only when length <= 3", () => {
    expect(formatUsPhoneMask("55")).toBe("55");
    expect(formatUsPhoneMask("555")).toBe("555");
  });

  it("formats 4-6 digits as xxx-xxx", () => {
    expect(formatUsPhoneMask("5551")).toBe("555-1");
    expect(formatUsPhoneMask("555123")).toBe("555-123");
  });

  it("formats full 10 digits as xxx-xxx-xxxx", () => {
    expect(formatUsPhoneMask("5551234567")).toBe("555-123-4567");
  });

  it("ignores non-digits and caps at 10 digits", () => {
    expect(formatUsPhoneMask("(555) 123-4567 ext")).toBe("555-123-4567");
  });

  it("truncates beyond 10 digits", () => {
    expect(formatUsPhoneMask("55512345678901")).toBe("555-123-4567");
  });
});

describe("national10Digits", () => {
  it("returns 10 digits for plain national number", () => {
    expect(national10Digits("5551234567")).toBe("5551234567");
  });

  it("strips leading 1 for 11-digit input", () => {
    expect(national10Digits("15551234567")).toBe("5551234567");
  });

  it("returns null for wrong length", () => {
    expect(national10Digits("555")).toBeNull();
    expect(national10Digits("555123456789")).toBeNull();
  });

  it("returns null when 11 digits but does not start with 1", () => {
    expect(national10Digits("25551234567")).toBeNull();
  });

  it("parses formatted input", () => {
    expect(national10Digits("(555) 123-4567")).toBe("5551234567");
  });
});

import { describe, expect, it } from "vitest";
import {
  readMondayAuthHeader,
  readMondayWebhookChallenge,
  splitScents,
} from "../webhook-helpers";

describe("splitScents", () => {
  it("returns empty array for null, undefined, empty string", () => {
    expect(splitScents(null)).toEqual([]);
    expect(splitScents(undefined)).toEqual([]);
    expect(splitScents("")).toEqual([]);
  });

  it("splits on comma and trims", () => {
    expect(splitScents("A, B , C")).toEqual(["A", "B", "C"]);
  });

  it("filters empty segments", () => {
    expect(splitScents("A,,B")).toEqual(["A", "B"]);
  });
});

describe("readMondayWebhookChallenge", () => {
  it("returns challenge string from plain object", () => {
    expect(readMondayWebhookChallenge({ challenge: "abc123" })).toBe("abc123");
  });

  it("returns null for missing or empty challenge", () => {
    expect(readMondayWebhookChallenge({})).toBeNull();
    expect(readMondayWebhookChallenge({ challenge: "" })).toBeNull();
  });

  it("returns null for non-object, array, or null", () => {
    expect(readMondayWebhookChallenge(null)).toBeNull();
    expect(readMondayWebhookChallenge(undefined)).toBeNull();
    expect(readMondayWebhookChallenge([])).toBeNull();
    expect(readMondayWebhookChallenge("x")).toBeNull();
  });

  it("returns null when challenge is not a string", () => {
    expect(readMondayWebhookChallenge({ challenge: 1 })).toBeNull();
  });
});

describe("readMondayAuthHeader", () => {
  it("prefers x-monday-token when present", () => {
    expect(
      readMondayAuthHeader({
        "x-monday-token": "token-a",
        authorization: "Bearer other",
      })
    ).toBe("token-a");
  });

  it("strips Bearer prefix from authorization", () => {
    expect(readMondayAuthHeader({ authorization: "Bearer secret-token" })).toBe("secret-token");
  });

  it("returns raw authorization when not Bearer", () => {
    expect(readMondayAuthHeader({ authorization: "raw-value" })).toBe("raw-value");
  });

  it("returns null when no usable headers", () => {
    expect(readMondayAuthHeader({})).toBeNull();
    expect(readMondayAuthHeader({ authorization: "" })).toBeNull();
  });

  it("returns null when x-monday-token is empty string", () => {
    expect(readMondayAuthHeader({ "x-monday-token": "" })).toBeNull();
  });
});

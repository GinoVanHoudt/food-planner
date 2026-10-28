import { describe, expect, it } from "vite-plus/test";
import { describeError } from "./errors";

describe("describeError", () => {
  it("says nothing when the user closed the popup", () => {
    expect(describeError({ code: "auth/popup-closed-by-user" })).toBeNull();
    expect(describeError({ code: "auth/cancelled-popup-request" })).toBeNull();
  });

  it("explains blocked popups and missing connections", () => {
    expect(describeError({ code: "auth/popup-blocked" })).toBe(
      "The sign-in popup was blocked. Allow popups and try again.",
    );
    expect(describeError({ code: "auth/network-request-failed" })).toBe(
      "No connection. Check your internet and try again.",
    );
  });

  it("falls back to a general message for anything else", () => {
    for (const error of [{ code: "auth/internal-error" }, new Error("boom"), null, undefined]) {
      expect(describeError(error)).toBe("Sign-in failed. Please try again.");
    }
  });
});

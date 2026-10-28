import { describe, expect, it } from "vite-plus/test";
import { cx } from "./cx";

describe("cx", () => {
  it("joins class names and drops falsy values", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("returns an empty string without class names", () => {
    expect(cx()).toBe("");
    expect(cx(false, null, undefined)).toBe("");
  });
});

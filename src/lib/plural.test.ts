import { describe, expect, it } from "vite-plus/test";
import { plural } from "./plural";

describe("plural", () => {
  it.each([
    [0, "0 items"],
    [1, "1 item"],
    [2, "2 items"],
  ])("counts %i", (count, expected) => {
    expect(plural(count, "item")).toBe(expected);
  });

  it("uses a custom plural form", () => {
    expect(plural(1, "leaf", "leaves")).toBe("1 leaf");
    expect(plural(3, "leaf", "leaves")).toBe("3 leaves");
    expect(plural(0, "leaf", "leaves")).toBe("0 leaves");
  });
});

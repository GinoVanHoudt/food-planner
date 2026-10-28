import { describe, expect, it } from "vite-plus/test";
import { insertBefore, moveItem } from "./list";

describe("moveItem", () => {
  const items = ["a", "b", "c"];

  it("swaps an item with its neighbour", () => {
    expect(moveItem(items, 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(items, 2, -1)).toEqual(["a", "c", "b"]);
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("returns the same list when the item is already at that end", () => {
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 2, 1)).toBe(items);
  });
});

describe("insertBefore", () => {
  const fridge = { id: "fridge", name: "Fridge" };
  const other = { id: "other", name: "Other" };
  const cellar = { id: "cellar", name: "Cellar" };

  it("adds the item before the one with the id", () => {
    expect(insertBefore([fridge, other], cellar, "other")).toEqual([fridge, cellar, other]);
    expect(insertBefore([other, fridge], cellar, "other")).toEqual([cellar, other, fridge]);
  });

  it("adds the item at the end when there is no such item", () => {
    expect(insertBefore([fridge], cellar, "other")).toEqual([fridge, cellar]);
    expect(insertBefore([], cellar, "other")).toEqual([cellar]);
  });
});

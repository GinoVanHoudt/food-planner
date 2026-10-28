import { describe, expect, it } from "vite-plus/test";
import { groupInOrder, withFallback } from "./group";

const fridge = { id: "fridge", name: "Fridge" };
const freezer = { id: "freezer", name: "Freezer" };
const other = { id: "other", name: "Other" };

describe("groupInOrder", () => {
  it("groups in the given order, with unknown groups in the fallback and empty ones left out", () => {
    const groups = [fridge, freezer, other];
    const items = [
      { name: "Peas", at: "freezer" },
      { name: "Milk", at: "fridge" },
      { name: "Rice", at: "deleted" },
      { name: "Ice", at: "freezer" },
    ];

    expect(groupInOrder(items, groups, (item) => item.at, "other")).toEqual([
      { group: groups[0], items: [items[1]] },
      { group: groups[1], items: [items[0], items[3]] },
      { group: groups[2], items: [items[2]] },
    ]);
  });

  it("drops items whose fallback group is missing too", () => {
    const items = [{ name: "Rice", at: "deleted" }];
    expect(groupInOrder(items, [fridge], (item) => item.at, "other")).toEqual([]);
  });
});

describe("withFallback", () => {
  it("adds the fallback group at the end when it is missing", () => {
    expect(withFallback([fridge, freezer], other)).toEqual([fridge, freezer, other]);
    expect(withFallback([], other)).toEqual([other]);
  });

  it("keeps the groups as they are when the fallback is there, wherever it is", () => {
    const groups = [other, fridge];
    expect(withFallback(groups, { id: "other", name: "Renamed" })).toBe(groups);
  });
});

import { describe, expect, it } from "vite-plus/test";
import { groupInOrder } from "./group";

describe("groupInOrder", () => {
  it("groups in the given order, with unknown groups in the fallback and empty ones left out", () => {
    const groups = [
      { id: "fridge", name: "Fridge" },
      { id: "freezer", name: "Freezer" },
      { id: "other", name: "Other" },
    ];
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
});

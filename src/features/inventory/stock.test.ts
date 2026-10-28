import { describe, expect, it } from "vite-plus/test";
import type { Slot } from "../planner/types";
import type { Recipe } from "../recipes/recipes";
import {
  addToStock,
  byExpiry,
  cookMeal,
  editedItem,
  expiry,
  take,
  type Stock,
  type StockItem,
} from "./stock";

const rice = { name: "Rice", amounts: [{ quantity: 500, unit: "g" }], always: false };
const salt = { name: "Salt", amounts: [], always: true };

const risotto: Recipe = {
  id: "risotto",
  name: "Risotto",
  servings: 2,
  ingredients: [
    { name: "Rice", quantity: 200, unit: "g" },
    { name: "Salt", quantity: null, unit: "" },
    { name: "Parmesan", quantity: 50, unit: "g" },
  ],
  instructions: "",
  sourceUrl: "",
  tags: [],
};
const recipes = new Map([[risotto.id, risotto]]);

describe("take", () => {
  it("takes matching units and reports what is missing", () => {
    expect(take(rice, [{ quantity: 0.7, unit: "kg" }])).toEqual({
      item: undefined,
      taken: [{ quantity: 500, unit: "g" }],
      missing: [{ quantity: 200, unit: "g" }],
    });
    expect(take(rice, [{ quantity: 2, unit: "cups" }])).toEqual({
      item: rice,
      taken: [],
      missing: [{ quantity: 2, unit: "cups" }],
    });
  });

  it("never uses up items that are always at home or have no amount", () => {
    const some = { name: "Rice", amounts: [], always: false };
    expect(take(salt, [{ quantity: 5, unit: "g" }])).toEqual({
      item: salt,
      taken: [],
      missing: [],
    });
    expect(take(some, [{ quantity: 5, unit: "g" }])).toEqual({
      item: some,
      taken: [],
      missing: [],
    });
  });

  it("counts a need without a quantity as covered by any amount", () => {
    expect(take(rice, [{ quantity: null, unit: "" }])).toEqual({
      item: rice,
      taken: [],
      missing: [],
    });
    expect(take(undefined, [{ quantity: null, unit: "" }]).missing).toEqual([
      { quantity: null, unit: "" },
    ]);
  });
});

describe("addToStock", () => {
  it("adds to existing items and creates new ones", () => {
    const stock: Stock = new Map([["rice", rice]]);
    const changes = addToStock(stock, [
      { name: "rice", amounts: [{ quantity: 1, unit: "kg" }] },
      { name: "Eggs", amounts: [{ quantity: 6, unit: "" }] },
      { name: "Eggs", amounts: [{ quantity: 4, unit: "" }] },
      { name: "Toilet paper", amounts: [] },
    ]);
    expect(changes).toEqual(
      new Map([
        ["rice", { name: "Rice", amounts: [{ quantity: 1500, unit: "g" }], always: false }],
        ["eggs", { name: "Eggs", amounts: [{ quantity: 10, unit: "" }], always: false }],
        ["toilet paper", { name: "Toilet paper", amounts: [], always: false }],
      ]),
    );
  });

  it("leaves items that are always at home alone", () => {
    const stock: Stock = new Map([["salt", salt]]);
    expect(addToStock(stock, [{ name: "Salt", amounts: [{ quantity: 1, unit: "kg" }] }]).size).toBe(
      0,
    );
  });
});

describe("addToStock expiry dates", () => {
  it("keeps the earliest date", () => {
    const dated: Stock = new Map([["rice", { ...rice, expires: "2026-11-10" }]]);
    const later = addToStock(dated, [{ name: "Rice", amounts: [], expires: "2026-12-01" }]);
    const sooner = addToStock(dated, [{ name: "Rice", amounts: [], expires: "2026-11-01" }]);
    const undated = addToStock(dated, [{ name: "Rice", amounts: [] }]);
    expect(later.get("rice")?.expires).toBe("2026-11-10");
    expect(sooner.get("rice")?.expires).toBe("2026-11-01");
    expect(undated.get("rice")?.expires).toBe("2026-11-10");
  });

  it("leaves out empty dates", () => {
    const changes = addToStock(new Map(), [{ name: "Eggs", amounts: [], expires: "" }]);
    expect(changes.get("eggs")).not.toHaveProperty("expires");
  });
});

describe("editedItem", () => {
  it("keeps positive amounts, or none for 'some' and always-available items", () => {
    expect(editedItem({ ...rice, amounts: [{ quantity: 300, unit: "g" }] })).toEqual({
      name: "Rice",
      amounts: [{ quantity: 300, unit: "g" }],
      always: false,
    });
    expect(editedItem({ ...rice, amounts: [] })).toEqual({
      name: "Rice",
      amounts: [],
      always: false,
    });
    expect(editedItem({ ...salt, amounts: [{ quantity: 1, unit: "kg" }] })).toEqual(salt);
  });

  it("keeps the expiry date, except for always-available items", () => {
    expect(editedItem({ ...rice, expires: "2026-11-04" })?.expires).toBe("2026-11-04");
    expect(editedItem({ ...rice, expires: "" })).not.toHaveProperty("expires");
    expect(editedItem({ ...salt, expires: "2026-11-04" })).toEqual(salt);
  });

  it("is used up when only zero amounts are typed", () => {
    expect(editedItem({ ...rice, amounts: [{ quantity: 0, unit: "g" }] })).toBeNull();
  });
});

describe("expiry", () => {
  const today = "2026-10-28";

  it("names the day and flags dates that are soon or past", () => {
    expect(expiry("2026-10-27", today)).toEqual({ label: "Expired", state: "expired" });
    expect(expiry(today, today)).toEqual({ label: "Expires today", state: "soon" });
    expect(expiry("2026-10-29", today)).toEqual({ label: "Expires tomorrow", state: "soon" });
    expect(expiry("2026-10-30", today)).toEqual({ label: "Expires 30 Oct", state: "soon" });
    expect(expiry("2026-10-31", today)).toEqual({ label: "Expires 31 Oct", state: "later" });
    expect(expiry("2027-03-01", today)).toEqual({ label: "Expires 1 Mar 2027", state: "later" });
  });

  it("sorts the soonest first and undated items last", () => {
    const soup = { name: "Soup", amounts: [], always: false, expires: "2026-11-02" };
    const lasagna = { ...soup, name: "Lasagna", expires: "2026-10-30" };
    expect([rice, soup, lasagna].sort(byExpiry)).toEqual([lasagna, soup, rice]);
  });
});

describe("cookMeal", () => {
  const stock: Stock = new Map([
    ["rice", rice],
    ["salt", salt],
  ]);
  const planned: Slot = { recipes: [{ recipeId: "risotto", servings: 4 }], note: "" };

  it("takes the ingredients out of the stock when a meal is cooked", () => {
    const { slot, changes } = cookMeal(planned, { ...planned, cooked: true }, recipes, stock);
    expect(changes).toEqual(
      new Map([["rice", { name: "Rice", amounts: [{ quantity: 100, unit: "g" }], always: false }]]),
    );
    expect(slot).toEqual({
      ...planned,
      cooked: true,
      taken: [{ name: "rice", amounts: [{ quantity: 400, unit: "g" }] }],
    });
  });

  it("puts back what was taken when a meal is no longer cooked", () => {
    const cooked: Slot = {
      ...planned,
      cooked: true,
      taken: [{ name: "Rice", amounts: [{ quantity: 400, unit: "g" }] }],
    };
    const { slot, changes } = cookMeal(cooked, { ...cooked, cooked: false }, recipes, new Map());
    expect(slot).toEqual(planned);
    expect(changes).toEqual(
      new Map([["rice", { name: "Rice", amounts: [{ quantity: 400, unit: "g" }], always: false }]]),
    );
  });

  it("changes nothing for other edits", () => {
    expect(cookMeal(planned, { ...planned, note: "Early" }, recipes, stock).changes.size).toBe(0);
  });

  it("takes the new amounts when a cooked meal's servings change", () => {
    // 400 g was taken for 4 servings, so 100 g is left; 2 servings need only 200 g.
    const cooked: Slot = {
      ...planned,
      cooked: true,
      taken: [{ name: "Rice", amounts: [{ quantity: 400, unit: "g" }] }],
    };
    const leftover: Stock = new Map([
      ["rice", { ...rice, amounts: [{ quantity: 100, unit: "g" }] }],
    ]);
    const fewer: Slot = { ...cooked, recipes: [{ recipeId: "risotto", servings: 2 }] };

    const { slot, changes } = cookMeal(cooked, fewer, recipes, leftover);

    expect(changes).toEqual(
      new Map([["rice", { name: "Rice", amounts: [{ quantity: 300, unit: "g" }], always: false }]]),
    );
    expect(slot.taken).toEqual([{ name: "rice", amounts: [{ quantity: 200, unit: "g" }] }]);
  });

  describe("with full meals from the inventory", () => {
    const soup: StockItem = {
      name: "pumpkin soup",
      amounts: [{ quantity: 1000, unit: "ml" }],
      always: false,
      expires: "2026-11-02",
    };
    const leftovers: StockItem = { name: "pasta leftovers", amounts: [], always: false };
    const frozen: Stock = new Map([
      ["pumpkin soup", soup],
      ["pasta leftovers", leftovers],
    ]);
    const planned: Slot = {
      recipes: [],
      fromInventory: ["pumpkin soup", "pasta leftovers"],
      note: "",
    };

    it("takes them out whole when cooked, whatever their amounts", () => {
      const { slot, changes } = cookMeal(planned, { ...planned, cooked: true }, recipes, frozen);
      expect(changes).toEqual(
        new Map([
          ["pumpkin soup", null],
          ["pasta leftovers", null],
        ]),
      );
      expect(slot.taken).toEqual([
        { name: "pumpkin soup", amounts: [{ quantity: 1000, unit: "ml" }], expires: "2026-11-02" },
        { name: "pasta leftovers", amounts: [] },
      ]);
    });

    it("puts them back, with their dates, when no longer cooked", () => {
      const cooked = cookMeal(planned, { ...planned, cooked: true }, recipes, frozen).slot;
      const { slot, changes } = cookMeal(cooked, { ...cooked, cooked: false }, recipes, new Map());
      expect(slot).toEqual(planned);
      expect(changes).toEqual(frozen);
    });

    it("takes them together with the recipes' ingredients", () => {
      const both: Slot = { ...planned, recipes: [{ recipeId: "risotto", servings: 2 }] };
      const { changes } = cookMeal(
        both,
        { ...both, cooked: true },
        recipes,
        new Map([...frozen, ["rice", rice]]),
      );
      expect([...changes.keys()]).toEqual(["pumpkin soup", "pasta leftovers", "rice"]);
    });

    it("drops the list when all are removed", () => {
      expect(cookMeal(planned, { ...planned, fromInventory: [] }, recipes, frozen).slot).toEqual({
        recipes: [],
        note: "",
      });
    });
  });
});

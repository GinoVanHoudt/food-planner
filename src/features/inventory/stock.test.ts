import { describe, expect, it } from "vite-plus/test";
import type { Slot } from "../planner/types";
import type { Recipe } from "../recipes/recipes";
import { addToStock, cookMeal, editedItem, take, type Stock } from "./stock";

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

describe("editedItem", () => {
  it("keeps positive amounts, or none for 'some' and always-available items", () => {
    expect(editedItem("Rice", [{ quantity: 300, unit: "g" }], false)).toEqual({
      name: "Rice",
      amounts: [{ quantity: 300, unit: "g" }],
      always: false,
    });
    expect(editedItem("Rice", [], false)).toEqual({ name: "Rice", amounts: [], always: false });
    expect(editedItem("Salt", [{ quantity: 1, unit: "kg" }], true)).toEqual({
      name: "Salt",
      amounts: [],
      always: true,
    });
  });

  it("is used up when only zero amounts are typed", () => {
    expect(editedItem("Rice", [{ quantity: 0, unit: "g" }], false)).toBeNull();
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
});

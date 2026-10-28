import { describe, expect, it } from "vite-plus/test";
import type { Need, Slot } from "../planner/types";
import type { Recipe } from "../recipes/recipes";
import {
  addToStock,
  applyChanges,
  byExpiry,
  consume,
  cookMeal,
  editedItem,
  expiresField,
  expiry,
  inventoryGroups,
  inventoryMeals,
  take,
  takeWhole,
  type Stock,
  type StockChanges,
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

  it("takes several units at once", () => {
    const mixed: StockItem = {
      name: "tomatoes",
      amounts: [
        { quantity: 500, unit: "g" },
        { quantity: 3, unit: "pcs" },
      ],
      always: false,
    };
    expect(
      take(mixed, [
        { quantity: 0.2, unit: "kg" },
        { quantity: 5, unit: "pcs" },
        { quantity: 1, unit: "cups" },
      ]),
    ).toEqual({
      item: { ...mixed, amounts: [{ quantity: 300, unit: "g" }] },
      taken: [
        { quantity: 200, unit: "g" },
        { quantity: 3, unit: "pcs" },
      ],
      missing: [
        { quantity: 2, unit: "pcs" },
        { quantity: 1, unit: "cups" },
      ],
    });
  });
});

describe("expiresField", () => {
  it("is the date, or nothing for no or an empty date", () => {
    expect(expiresField("2026-11-04")).toEqual({ expires: "2026-11-04" });
    expect(expiresField(undefined)).toEqual({});
    expect(expiresField("")).toEqual({});
  });
});

describe("applyChanges", () => {
  it("sets and deletes items without changing the stock it is given", () => {
    const stock: Stock = new Map([
      ["rice", rice],
      ["salt", salt],
    ]);
    const less = { ...rice, amounts: [{ quantity: 100, unit: "g" }] };
    const eggs = { name: "eggs", amounts: [], always: false };
    const changes: StockChanges = new Map([
      ["rice", less],
      ["salt", null],
      ["eggs", eggs],
      ["missing", null],
    ]);

    expect(applyChanges(stock, changes)).toEqual(
      new Map([
        ["rice", less],
        ["eggs", eggs],
      ]),
    );
    expect(stock).toEqual(
      new Map([
        ["rice", rice],
        ["salt", salt],
      ]),
    );
  });
});

describe("consume", () => {
  const need = (name: string, ...amounts: Need["amounts"]): Need => ({
    name,
    amounts,
    sources: ["risotto"],
  });
  const stock: Stock = new Map<string, StockItem>([
    ["rice", { ...rice, expires: "2026-11-10" }],
    ["salt", salt],
    ["butter", { name: "butter", amounts: [], always: false }],
    ["milk", { name: "milk", amounts: [{ quantity: 1, unit: "l" }], always: false }],
  ]);

  it("changes only the items something was taken from", () => {
    const { changes, taken } = consume(
      stock,
      new Map([
        ["rice", need("rice", { quantity: 200, unit: "g" })],
        ["salt", need("salt", { quantity: 5, unit: "g" })],
        ["butter", need("butter", { quantity: 50, unit: "g" })],
        ["milk", need("milk", { quantity: 2, unit: "cups" })],
        ["parmesan", need("parmesan", { quantity: 50, unit: "g" })],
      ]),
    );
    expect(changes).toEqual(
      new Map([
        [
          "rice",
          {
            name: "Rice",
            amounts: [{ quantity: 300, unit: "g" }],
            always: false,
            expires: "2026-11-10",
          },
        ],
      ]),
    );
    expect(taken).toEqual([
      { name: "rice", amounts: [{ quantity: 200, unit: "g" }], expires: "2026-11-10" },
    ]);
  });

  it("deletes used-up items and takes only what is there", () => {
    const { changes, taken } = consume(
      stock,
      new Map([["milk", need("milk", { quantity: 1500, unit: "ml" })]]),
    );
    expect(changes).toEqual(new Map([["milk", null]]));
    expect(taken).toEqual([{ name: "milk", amounts: [{ quantity: 1000, unit: "ml" }] }]);
  });
});

describe("takeWhole", () => {
  const soup: StockItem = {
    name: "pumpkin soup",
    amounts: [{ quantity: 2, unit: "portions" }],
    always: false,
    expires: "2026-11-02",
  };
  const stock: Stock = new Map<string, StockItem>([
    ["pumpkin soup", soup],
    ["salt", salt],
  ]);

  it("takes meals out by key, with their amounts and date", () => {
    expect(takeWhole(stock, ["Pumpkin  Soup "])).toEqual({
      changes: new Map([["pumpkin soup", null]]),
      taken: [
        {
          name: "pumpkin soup",
          amounts: [{ quantity: 2, unit: "portions" }],
          expires: "2026-11-02",
        },
      ],
    });
  });

  it("skips missing meals and items that are always at home", () => {
    expect(takeWhole(stock, ["lasagna", "salt"])).toEqual({ changes: new Map(), taken: [] });
  });
});

describe("addToStock", () => {
  it("adds to existing items and creates new ones, named in lower case", () => {
    const stock: Stock = new Map([["rice", rice]]);
    const changes = addToStock(stock, [
      { name: "rice", amounts: [{ quantity: 1, unit: "kg" }] },
      { name: "Eggs", amounts: [{ quantity: 6, unit: "" }] },
      { name: "Eggs", amounts: [{ quantity: 4, unit: "" }] },
      { name: " Toilet  paper", amounts: [] },
    ]);
    expect(changes).toEqual(
      new Map([
        ["rice", { name: "Rice", amounts: [{ quantity: 1500, unit: "g" }], always: false }],
        ["eggs", { name: "eggs", amounts: [{ quantity: 10, unit: "" }], always: false }],
        ["toilet paper", { name: "toilet paper", amounts: [], always: false }],
      ]),
    );
  });

  it("leaves items that are always at home alone", () => {
    const stock: Stock = new Map([["salt", salt]]);
    expect(addToStock(stock, [{ name: "Salt", amounts: [{ quantity: 1, unit: "kg" }] }]).size).toBe(
      0,
    );
  });

  it("skips lines without a name", () => {
    expect(addToStock(new Map(), [{ name: "  ", amounts: [{ quantity: 1, unit: "" }] }]).size).toBe(
      0,
    );
  });

  it("adds up lines for the same item, keeps its name, drops empty quantities and merges kg and g", () => {
    const stock: Stock = new Map([["rice", rice]]);
    const changes = addToStock(stock, [
      { name: "RICE ", amounts: [{ quantity: 1, unit: "kg" }] },
      {
        name: "rice",
        amounts: [
          { quantity: 250, unit: "g" },
          { quantity: null, unit: "" },
        ],
      },
      { name: "flour", amounts: [{ quantity: null, unit: "g" }] },
    ]);
    expect(changes).toEqual(
      new Map([
        ["rice", { name: "Rice", amounts: [{ quantity: 1750, unit: "g" }], always: false }],
        ["flour", { name: "flour", amounts: [], always: false }],
      ]),
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

  it("is 'some' when no amount has a quantity", () => {
    expect(editedItem({ ...rice, amounts: [{ quantity: null, unit: "g" }] })).toEqual({
      name: "Rice",
      amounts: [],
      always: false,
    });
  });

  it("drops zero and empty amounts next to positive ones", () => {
    expect(
      editedItem({
        ...rice,
        amounts: [
          { quantity: 0, unit: "g" },
          { quantity: 2, unit: "pcs" },
          { quantity: null, unit: "" },
        ],
      }),
    ).toEqual({ name: "Rice", amounts: [{ quantity: 2, unit: "pcs" }], always: false });
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

  it("treats equal dates as equal", () => {
    const soup = { name: "Soup", amounts: [], always: false, expires: "2026-11-02" };
    expect(byExpiry(soup, { ...soup, name: "Lasagna" })).toBe(0);
    expect(byExpiry(rice, { ...rice, name: "Pasta" })).toBe(0);
  });
});

describe("inventoryMeals", () => {
  it("lists the full meals that are not always at home, soonest expiry first", () => {
    const soup = { name: "soup", amounts: [], always: false, expires: "2026-11-02" };
    const lasagna = { ...soup, name: "lasagna", expires: "2026-10-30" };
    const leftovers = { name: "leftovers", amounts: [], always: false };
    const stew = { name: "stew", amounts: [], always: true };
    const meals = new Set(["soup", "lasagna", "leftovers", "stew"]);
    expect(
      inventoryMeals([leftovers, rice, soup, stew, lasagna], (name) => meals.has(name)),
    ).toEqual([lasagna, soup, leftovers]);
  });
});

describe("inventoryGroups", () => {
  const locations = [
    { id: "fridge", name: "Fridge" },
    { id: "freezer", name: "Freezer" },
    { id: "other", name: "Other" },
  ];
  const kept: Record<string, string> = { milk: "fridge", peas: "freezer", rice: "cellar" };
  const locationOf = (name: string) => kept[name] ?? "other";
  const milk = { name: "milk", amounts: [], always: false };
  const peas = { name: "peas", amounts: [], always: false };
  const pantryRice = { name: "rice", amounts: [], always: false };
  const oil = { name: "oil", amounts: [], always: true };

  it("groups by location in their order, with deleted ones under the fallback and always-at-home items last", () => {
    expect(inventoryGroups([oil, pantryRice, peas, milk], locations, locationOf, "other")).toEqual([
      { group: locations[0], items: [milk] },
      { group: locations[1], items: [peas] },
      { group: locations[2], items: [pantryRice] },
      { group: { id: "always", name: "Always at home" }, items: [oil] },
    ]);
  });

  it("leaves out empty groups", () => {
    expect(inventoryGroups([milk], locations, locationOf, "other")).toEqual([
      { group: locations[0], items: [milk] },
    ]);
    expect(inventoryGroups([], locations, locationOf, "other")).toEqual([]);
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
      taken: [{ name: "rice", amounts: [{ quantity: 400, unit: "g" }] }],
    };
    const { slot, changes } = cookMeal(cooked, { ...cooked, cooked: false }, recipes, new Map());
    expect(slot).toEqual(planned);
    expect(changes).toEqual(
      new Map([["rice", { name: "rice", amounts: [{ quantity: 400, unit: "g" }], always: false }]]),
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

  it("takes only what is there when ingredients are partly missing", () => {
    const little: Stock = new Map([["rice", { ...rice, amounts: [{ quantity: 300, unit: "g" }] }]]);
    const { slot, changes } = cookMeal(planned, { ...planned, cooked: true }, recipes, little);
    expect(changes).toEqual(new Map([["rice", null]]));
    expect(slot.taken).toEqual([{ name: "rice", amounts: [{ quantity: 300, unit: "g" }] }]);
  });

  it("keeps what was taken when a cooked meal is saved without changing its food", () => {
    const taken = [{ name: "rice", amounts: [{ quantity: 400, unit: "g" }] }];
    const cooked: Slot = { ...planned, cooked: true, taken };
    const { slot, changes } = cookMeal(cooked, { ...cooked, note: "Lovely" }, recipes, stock);
    expect(changes.size).toBe(0);
    expect(slot).toEqual({ ...planned, note: "Lovely", cooked: true, taken });
  });

  it("puts everything back when a cooked meal loses all its food", () => {
    const cooked: Slot = {
      ...planned,
      cooked: true,
      taken: [{ name: "rice", amounts: [{ quantity: 400, unit: "g" }] }],
    };
    const { slot, changes } = cookMeal(cooked, { ...cooked, recipes: [] }, recipes, new Map());
    expect(slot).toEqual({ recipes: [], note: "" });
    expect(changes).toEqual(
      new Map([["rice", { name: "rice", amounts: [{ quantity: 400, unit: "g" }], always: false }]]),
    );
  });

  it("is not cooked without food", () => {
    const note: Slot = { recipes: [], note: "Eat out" };
    expect(cookMeal(note, { ...note, cooked: true }, recipes, stock)).toEqual({
      slot: note,
      changes: new Map(),
    });
  });

  it("does not put back what has since become always at home", () => {
    const cooked: Slot = {
      ...planned,
      cooked: true,
      taken: [{ name: "rice", amounts: [{ quantity: 400, unit: "g" }] }],
    };
    const always: Stock = new Map([["rice", { name: "rice", amounts: [], always: true }]]);
    expect(cookMeal(cooked, { ...cooked, cooked: false }, recipes, always).changes.size).toBe(0);
  });

  it("adds what is put back to restocked items, keeping the earliest date", () => {
    const cooked: Slot = {
      ...planned,
      cooked: true,
      taken: [{ name: "rice", amounts: [{ quantity: 400, unit: "g" }], expires: "2026-11-10" }],
    };
    const restocked: Stock = new Map([
      ["rice", { ...rice, amounts: [{ quantity: 1, unit: "kg" }], expires: "2027-03-01" }],
    ]);
    expect(cookMeal(cooked, { ...cooked, cooked: false }, recipes, restocked).changes).toEqual(
      new Map([
        [
          "rice",
          {
            name: "Rice",
            amounts: [{ quantity: 1400, unit: "g" }],
            always: false,
            expires: "2026-11-10",
          },
        ],
      ]),
    );
  });

  it("does not take inventory meals that are gone", () => {
    const soup: Slot = { recipes: [], fromInventory: ["pumpkin soup"], note: "" };
    expect(cookMeal(soup, { ...soup, cooked: true }, recipes, stock)).toEqual({
      slot: { ...soup, cooked: true, taken: [] },
      changes: new Map(),
    });
  });

  it("restores the stock when a meal is cooked and then no longer cooked", () => {
    const original: Stock = new Map<string, StockItem>([
      ["rice", { name: "rice", amounts: [{ quantity: 500, unit: "g" }], always: false }],
      [
        "parmesan",
        {
          name: "parmesan",
          amounts: [{ quantity: 80, unit: "g" }],
          always: false,
          expires: "2026-11-05",
        },
      ],
      ["salt", salt],
      [
        "pumpkin soup",
        {
          name: "pumpkin soup",
          amounts: [{ quantity: 750, unit: "ml" }],
          always: false,
          expires: "2026-12-01",
        },
      ],
      ["pasta leftovers", { name: "pasta leftovers", amounts: [], always: false }],
    ]);
    const meal: Slot = {
      recipes: [{ recipeId: "risotto", servings: 4 }],
      fromInventory: ["pumpkin soup", "pasta leftovers"],
      note: "",
    };

    const cooked = cookMeal(meal, { ...meal, cooked: true }, recipes, original);
    const eaten = applyChanges(original, cooked.changes);
    expect([...eaten.keys()]).toEqual(["rice", "salt"]);

    const undone = cookMeal(cooked.slot, { ...cooked.slot, cooked: false }, recipes, eaten);
    expect(undone.slot).toEqual(meal);
    expect(applyChanges(eaten, undone.changes)).toEqual(original);
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

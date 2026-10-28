import { describe, expect, it } from "vite-plus/test";
import type { Stock } from "../inventory/stock";
import type { DayPlan } from "../planner/types";
import type { Recipe } from "../recipes/recipes";
import { buildList } from "./buildList";

function recipe(id: string, servings: number, ingredients: Recipe["ingredients"]): Recipe {
  return { id, name: id, servings, ingredients, instructions: "", sourceUrl: "", tags: [] };
}

const chili = recipe("Chili", 4, [
  { name: "Onion", quantity: 2, unit: "" },
  { name: "Minced beef", quantity: 500, unit: "g" },
  { name: "Salt", quantity: null, unit: "" },
]);

const curry = recipe("Curry", 2, [
  { name: "onion", quantity: 1, unit: "" },
  { name: "Coconut milk", quantity: 400, unit: "ml" },
  { name: "minced beef", quantity: 0.25, unit: "kg" },
]);

const recipes = new Map([chili, curry].map((item) => [item.id, item]));

const sections: Record<string, string> = { onion: "produce", "minced beef": "meat" };
const sectionOf = (name: string) => sections[name.toLowerCase()] ?? "other";

function plan(...days: DayPlan[]) {
  return new Map(days.map((day) => [day.id, day]));
}

const noStock: Stock = new Map();

describe("buildList", () => {
  it("merges ingredients across recipes in lower case, scaled to the planned servings", () => {
    const days = plan(
      { id: "2026-10-26", dinner: { recipes: [{ recipeId: "Chili", servings: 4 }], note: "" } },
      { id: "2026-10-27", lunch: { recipes: [{ recipeId: "Curry", servings: 4 }], note: "" } },
    );

    const { items, mealCount } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-27",
      today: "2026-10-26",
      stock: noStock,
      sectionOf,
    });

    expect(mealCount).toBe(2);
    expect(items).toEqual([
      {
        name: "coconut milk",
        amounts: [{ quantity: 800, unit: "ml" }],
        sectionId: "other",
        sources: ["curry"],
      },
      {
        name: "minced beef",
        amounts: [{ quantity: 1000, unit: "g" }],
        sectionId: "meat",
        sources: ["chili", "curry"],
      },
      {
        name: "onion",
        amounts: [{ quantity: 4, unit: "" }],
        sectionId: "produce",
        sources: ["chili", "curry"],
      },
      {
        name: "salt",
        amounts: [{ quantity: null, unit: "" }],
        sectionId: "other",
        sources: ["chili"],
      },
    ]);
  });

  it("rounds whole items up when scaling down", () => {
    const days = plan({
      id: "2026-10-26",
      dinner: { recipes: [{ recipeId: "Chili", servings: 1 }], note: "" },
    });

    const { items } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock: noStock,
      sectionOf,
    });

    expect(items.find((item) => item.name === "onion")?.amounts).toEqual([
      { quantity: 1, unit: "" },
    ]);
    expect(items.find((item) => item.name === "minced beef")?.amounts).toEqual([
      { quantity: 125, unit: "g" },
    ]);
  });

  it("only includes days in the range and skips notes and deleted recipes", () => {
    const days = plan(
      { id: "2026-10-25", dinner: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "" } },
      { id: "2026-10-26", lunch: { recipes: [], note: "Leftovers" } },
      { id: "2026-10-27", dinner: { recipes: [{ recipeId: "Gone", servings: 2 }], note: "" } },
    );

    const { items, mealCount } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-27",
      today: "2026-10-26",
      stock: noStock,
      sectionOf,
    });

    expect(items).toEqual([]);
    expect(mealCount).toBe(1);
  });

  it("takes from the stock first and skips what is always at home", () => {
    const days = plan({
      id: "2026-10-26",
      dinner: { recipes: [{ recipeId: "Chili", servings: 4 }], note: "" },
    });
    const stock: Stock = new Map([
      ["onion", { name: "Onion", amounts: [{ quantity: 5, unit: "" }], always: false }],
      [
        "minced beef",
        { name: "Minced beef", amounts: [{ quantity: 200, unit: "g" }], always: false },
      ],
      ["salt", { name: "Salt", amounts: [], always: true }],
    ]);

    const { items, atHome } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock,
      sectionOf,
    });

    expect(atHome).toBe(2);
    expect(items).toEqual([
      {
        name: "minced beef",
        amounts: [{ quantity: 300, unit: "g" }],
        sectionId: "meat",
        sources: ["chili"],
      },
    ]);
  });

  it("does not list amounts too small to buy", () => {
    const days = plan({
      id: "2026-10-26",
      dinner: { recipes: [{ recipeId: "Chili", servings: 4 }], note: "" },
    });
    const stock: Stock = new Map([
      [
        "minced beef",
        { name: "Minced beef", amounts: [{ quantity: 499.999, unit: "g" }], always: false },
      ],
    ]);

    const { items } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock,
      sectionOf,
    });

    expect(items.map((item) => item.name)).not.toContain("minced beef");
  });

  it("skips cooked meals and sets aside stock for meals before the range", () => {
    const days = plan(
      {
        id: "2026-10-26",
        lunch: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "", cooked: true },
        dinner: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "" },
      },
      { id: "2026-10-27", dinner: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "" } },
    );
    const stock: Stock = new Map([
      [
        "coconut milk",
        { name: "Coconut milk", amounts: [{ quantity: 600, unit: "ml" }], always: false },
      ],
    ]);

    const { items, mealCount } = buildList({
      days,
      recipes,
      from: "2026-10-27",
      to: "2026-10-27",
      today: "2026-10-26",
      stock,
      sectionOf,
    });

    // Today's dinner still needs 400 ml, so only 200 ml of the stock is left for tomorrow.
    expect(mealCount).toBe(1);
    expect(items.find((item) => item.name === "coconut milk")?.amounts).toEqual([
      { quantity: 200, unit: "ml" },
    ]);
  });

  it("does not set aside stock for meals before the range that are cooked", () => {
    const days = plan(
      {
        id: "2026-10-26",
        dinner: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "", cooked: true },
      },
      { id: "2026-10-27", dinner: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "" } },
    );
    const stock: Stock = new Map([
      [
        "coconut milk",
        { name: "coconut milk", amounts: [{ quantity: 400, unit: "ml" }], always: false },
      ],
    ]);

    const { items } = buildList({
      days,
      recipes,
      from: "2026-10-27",
      to: "2026-10-27",
      today: "2026-10-26",
      stock,
      sectionOf,
    });

    expect(items.map((item) => item.name)).not.toContain("coconut milk");
  });

  it("includes meals from a start before today and sets nothing aside", () => {
    const days = plan(
      { id: "2026-10-25", dinner: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "" } },
      { id: "2026-10-26", dinner: { recipes: [{ recipeId: "Curry", servings: 2 }], note: "" } },
    );
    const stock: Stock = new Map([
      [
        "coconut milk",
        { name: "coconut milk", amounts: [{ quantity: 600, unit: "ml" }], always: false },
      ],
    ]);

    const { items, mealCount } = buildList({
      days,
      recipes,
      from: "2026-10-25",
      to: "2026-10-26",
      today: "2026-10-26",
      stock,
      sectionOf,
    });

    expect(mealCount).toBe(2);
    expect(items.find((item) => item.name === "coconut milk")?.amounts).toEqual([
      { quantity: 200, unit: "ml" },
    ]);
  });

  it("does not count meals with only inventory meals", () => {
    const days = plan({
      id: "2026-10-26",
      lunch: { recipes: [], fromInventory: ["pumpkin soup"], note: "" },
    });

    const result = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock: noStock,
      sectionOf,
    });

    expect(result).toEqual({ items: [], mealCount: 0, atHome: 0 });
  });

  it("merges a recipe planned twice", () => {
    const days = plan(
      { id: "2026-10-26", dinner: { recipes: [{ recipeId: "Chili", servings: 4 }], note: "" } },
      { id: "2026-10-27", lunch: { recipes: [{ recipeId: "Chili", servings: 2 }], note: "" } },
    );

    const { items, mealCount } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-27",
      today: "2026-10-26",
      stock: noStock,
      sectionOf,
    });

    expect(mealCount).toBe(2);
    expect(items.find((item) => item.name === "minced beef")).toEqual({
      name: "minced beef",
      amounts: [{ quantity: 750, unit: "g" }],
      sectionId: "meat",
      sources: ["chili"],
    });
    expect(items.find((item) => item.name === "onion")?.amounts).toEqual([
      { quantity: 3, unit: "" },
    ]);
  });

  it("counts stock that covers the need, exactly or as 'some', as at home", () => {
    const days = plan({
      id: "2026-10-26",
      dinner: { recipes: [{ recipeId: "Chili", servings: 4 }], note: "" },
    });
    const stock: Stock = new Map([
      ["onion", { name: "onion", amounts: [{ quantity: 2, unit: "" }], always: false }],
      ["minced beef", { name: "minced beef", amounts: [], always: false }],
    ]);

    const { items, atHome } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock,
      sectionOf,
    });

    expect(atHome).toBe(2);
    expect(items.map((item) => item.name)).toEqual(["salt"]);
  });

  it("leaves out needs too small to buy without counting them as at home", () => {
    const pinch = recipe("Soup", 100, [{ name: "Saffron", quantity: 0.4, unit: "g" }]);
    const days = plan({
      id: "2026-10-26",
      dinner: { recipes: [{ recipeId: "Soup", servings: 1 }], note: "" },
    });

    const result = buildList({
      days,
      recipes: new Map([["Soup", pinch]]),
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock: noStock,
      sectionOf,
    });

    expect(result).toEqual({ items: [], mealCount: 1, atHome: 0 });
  });

  it("lists the full need when the stock is in another unit", () => {
    const days = plan({
      id: "2026-10-26",
      dinner: { recipes: [{ recipeId: "Chili", servings: 4 }], note: "" },
    });
    const stock: Stock = new Map([
      [
        "minced beef",
        { name: "minced beef", amounts: [{ quantity: 2, unit: "pcs" }], always: false },
      ],
    ]);

    const { items, atHome } = buildList({
      days,
      recipes,
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock,
      sectionOf,
    });

    expect(atHome).toBe(0);
    expect(items.find((item) => item.name === "minced beef")?.amounts).toEqual([
      { quantity: 500, unit: "g" },
    ]);
  });

  it("sorts items by their lower-case name and looks up sections by it", () => {
    const fruit = recipe("Fruit", 1, [
      { name: "Zucchini", quantity: 1, unit: "" },
      { name: "apple", quantity: 1, unit: "" },
      { name: "Banana", quantity: 1, unit: "" },
    ]);
    const days = plan({
      id: "2026-10-26",
      lunch: { recipes: [{ recipeId: "Fruit", servings: 1 }], note: "" },
    });
    const asked: string[] = [];

    const { items } = buildList({
      days,
      recipes: new Map([["Fruit", fruit]]),
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock: noStock,
      sectionOf: (name) => {
        asked.push(name);
        return "produce";
      },
    });

    expect(items.map((item) => item.name)).toEqual(["apple", "banana", "zucchini"]);
    expect(asked.sort()).toEqual(["apple", "banana", "zucchini"]);
  });

  it("rounds cans and cloves up and other units to 2 decimals", () => {
    const sauce = recipe("Sauce", 3, [
      { name: "Tomatoes", quantity: 1, unit: "can" },
      { name: "Garlic", quantity: 2, unit: "cloves" },
      { name: "Sugar", quantity: 1, unit: "tbsp" },
    ]);
    const days = plan({
      id: "2026-10-26",
      dinner: { recipes: [{ recipeId: "Sauce", servings: 1 }], note: "" },
    });

    const { items } = buildList({
      days,
      recipes: new Map([["Sauce", sauce]]),
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-26",
      stock: noStock,
      sectionOf,
    });

    expect(items.map(({ name, amounts }) => ({ name, amounts }))).toEqual([
      { name: "garlic", amounts: [{ quantity: 1, unit: "cloves" }] },
      { name: "sugar", amounts: [{ quantity: 0.33, unit: "tbsp" }] },
      { name: "tomatoes", amounts: [{ quantity: 1, unit: "cans" }] },
    ]);
  });
});

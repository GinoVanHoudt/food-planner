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
});

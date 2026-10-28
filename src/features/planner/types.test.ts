import { describe, expect, it } from "vite-plus/test";
import type { Recipe } from "../recipes/recipes";
import {
  collectNeeds,
  hasFood,
  isEmptySlot,
  isLeftoversNote,
  leftoversNote,
  plannedCount,
  plannedLabel,
  previousSlot,
  recipeNames,
  upcomingPlans,
  type DayPlan,
  type Slot,
} from "./types";

const chili = { recipeId: "chili", servings: 4 };

function recipe(
  id: string,
  name: string,
  servings: number,
  ingredients: Recipe["ingredients"],
): Recipe {
  return { id, name, servings, ingredients, instructions: "", sourceUrl: "", tags: [] };
}

function slot(...recipes: { recipeId: string; servings: number }[]): Slot {
  return { recipes, note: "" };
}

describe("hasFood", () => {
  it("is true for recipes or inventory meals only", () => {
    expect(hasFood(slot(chili))).toBe(true);
    expect(hasFood({ recipes: [], fromInventory: ["pumpkin soup"], note: "" })).toBe(true);
    expect(hasFood({ recipes: [], fromInventory: [], note: "Eat out" })).toBe(false);
  });
});

describe("isEmptySlot", () => {
  it("is empty when missing or with only a blank note", () => {
    expect(isEmptySlot(undefined)).toBe(true);
    expect(isEmptySlot({ recipes: [], note: "  \n " })).toBe(true);
  });

  it("is not empty with a note or inventory meals only", () => {
    expect(isEmptySlot({ recipes: [], note: "Eat out" })).toBe(false);
    expect(isEmptySlot({ recipes: [], fromInventory: ["pumpkin soup"], note: "" })).toBe(false);
  });
});

describe("plannedCount", () => {
  it("counts the meals with food or a note on the given days", () => {
    const days = new Map<string, DayPlan>([
      ["2026-10-28", { id: "2026-10-28", lunch: slot(chili), dinner: { recipes: [], note: " " } }],
      [
        "2026-10-29",
        {
          id: "2026-10-29",
          lunch: { recipes: [], note: "Eat out" },
          dinner: { recipes: [], fromInventory: ["pumpkin soup"], note: "" },
        },
      ],
      ["2026-10-30", { id: "2026-10-30", lunch: slot(chili) }],
    ]);
    expect(plannedCount(days, ["2026-10-28", "2026-10-29", "2026-10-31"])).toBe(3);
    expect(plannedCount(days, [])).toBe(0);
  });
});

describe("previousSlot", () => {
  const lunch = { recipes: [], note: "Lunch" };
  const dinner = { recipes: [], note: "Dinner" };
  const days = new Map<string, DayPlan>([
    ["2026-10-31", { id: "2026-10-31", lunch, dinner }],
    ["2026-11-01", { id: "2026-11-01", lunch }],
    ["2027-01-01", { id: "2027-01-01", lunch }],
  ]);

  it("is the same day's lunch for dinner", () => {
    expect(previousSlot(days, "2026-10-31", "dinner")).toBe(lunch);
  });

  it("is the previous day's dinner for lunch, across a month boundary", () => {
    expect(previousSlot(days, "2026-11-01", "lunch")).toBe(dinner);
  });

  it("is undefined for missing days or meals", () => {
    expect(previousSlot(days, "2027-01-01", "lunch")).toBeUndefined();
    expect(previousSlot(days, "2026-12-25", "dinner")).toBeUndefined();
    expect(previousSlot(days, "2026-11-02", "lunch")).toBeUndefined();
  });
});

describe("upcomingPlans", () => {
  const days = new Map<string, DayPlan>([
    ["2026-10-27", { id: "2026-10-27", dinner: { recipes: [chili], note: "" } }],
    [
      "2026-10-28",
      {
        id: "2026-10-28",
        lunch: { recipes: [chili], note: "", cooked: true },
        dinner: { recipes: [chili], fromInventory: ["pumpkin soup"], note: "" },
      },
    ],
    [
      "2026-10-30",
      {
        id: "2026-10-30",
        lunch: { recipes: [chili], note: "" },
        dinner: { recipes: [chili], note: "" },
      },
    ],
    [
      "2026-10-29",
      { id: "2026-10-29", lunch: { recipes: [], fromInventory: ["pumpkin soup"], note: "" } },
    ],
  ]);

  it("lists the days from today on, once per day, skipping cooked meals", () => {
    const plans = upcomingPlans(days, "2026-10-28", { day: "2026-10-31", meal: "lunch" });
    expect(plans.recipes).toEqual(new Map([["chili", ["2026-10-28", "2026-10-30"]]]));
    expect(plans.fromInventory).toEqual(new Map([["pumpkin soup", ["2026-10-28", "2026-10-29"]]]));
  });

  it("leaves out the meal being edited", () => {
    const plans = upcomingPlans(days, "2026-10-28", { day: "2026-10-28", meal: "dinner" });
    expect(plans.recipes.get("chili")).toEqual(["2026-10-30"]);
    expect(plans.fromInventory.get("pumpkin soup")).toEqual(["2026-10-29"]);
  });

  it("lists days in order and once each, however the days are stored", () => {
    const curry = { recipeId: "curry", servings: 2 };
    const unordered = new Map<string, DayPlan>([
      ["2026-11-02", { id: "2026-11-02", lunch: slot(curry) }],
      ["2026-10-20", { id: "2026-10-20", lunch: slot(curry) }],
      ["2026-10-29", { id: "2026-10-29", lunch: slot(curry, curry), dinner: slot(curry) }],
    ]);
    const plans = upcomingPlans(unordered, "2026-10-28", { day: "2026-10-28", meal: "lunch" });
    expect(plans.recipes).toEqual(new Map([["curry", ["2026-10-29", "2026-11-02"]]]));
  });
});

describe("plannedLabel", () => {
  it("names the days near today", () => {
    expect(plannedLabel(["2026-10-28", "2026-10-30", "2026-11-05"], "2026-10-28")).toBe(
      "Planned today, Fri, Thu 5 Nov",
    );
    expect(plannedLabel(["2026-10-29"], "2026-10-28")).toBe("Planned tomorrow");
  });

  it("is undefined when there are no days", () => {
    expect(plannedLabel(undefined, "2026-10-28")).toBeUndefined();
    expect(plannedLabel([], "2026-10-28")).toBeUndefined();
  });
});

describe("leftovers notes", () => {
  it("names the recipes of the previous meal", () => {
    expect(leftoversNote(["chili sin carne", "rice"])).toBe("Leftovers: chili sin carne + rice");
    expect(leftoversNote([])).toBe("Leftovers");
  });

  it("recognises picked and typed leftovers notes", () => {
    expect(isLeftoversNote(leftoversNote(["chili"]))).toBe(true);
    expect(isLeftoversNote(leftoversNote([]))).toBe(true);
    expect(isLeftoversNote(" leftovers from Sunday")).toBe(true);
    expect(isLeftoversNote("Eating out")).toBe(false);
    expect(isLeftoversNote("")).toBe(false);
  });
});

describe("recipeNames", () => {
  const recipes = new Map([["chili", recipe("chili", "chili sin carne", 4, [])]]);

  it("names the planned recipes and skips deleted ones", () => {
    const planned = slot(chili, { recipeId: "gone", servings: 2 }, chili);
    expect(recipeNames(planned, recipes)).toEqual(["chili sin carne", "chili sin carne"]);
    expect(recipeNames(undefined, recipes)).toEqual([]);
  });
});

describe("collectNeeds", () => {
  const soup = recipe("soup", "Pumpkin Soup", 4, [
    { name: "Pumpkin", quantity: 1, unit: "kg" },
    { name: "Olive  Oil ", quantity: 2, unit: "tbsp" },
    { name: "Salt/Pepper", quantity: null, unit: "" },
    { name: "  ", quantity: 1, unit: "" },
  ]);
  const salad = recipe("salad", "pumpkin salad", 0, [
    { name: "pumpkin", quantity: 250, unit: "g" },
    { name: "olive oil", quantity: 1, unit: "tbsp" },
    { name: "salt-pepper", quantity: null, unit: "" },
    { name: "Stock", quantity: 0.5, unit: "l" },
    { name: "stock", quantity: 200, unit: "ml" },
  ]);
  const recipes = new Map([soup, salad].map((item) => [item.id, item]));

  it("scales by the planned servings over the recipe's servings", () => {
    const needs = collectNeeds([slot({ recipeId: "soup", servings: 2 })], recipes);
    expect(needs.get("pumpkin")?.amounts).toEqual([{ quantity: 500, unit: "g" }]);
    expect(needs.get("olive oil")?.amounts).toEqual([{ quantity: 1, unit: "tbsp" }]);
  });

  it("counts a recipe with 0 servings as 1 serving", () => {
    const needs = collectNeeds([slot({ recipeId: "salad", servings: 2 })], recipes);
    expect(needs.get("pumpkin")?.amounts).toEqual([{ quantity: 500, unit: "g" }]);
  });

  it("merges names by key, keeping the first cleaned name, and adds up metric units", () => {
    const needs = collectNeeds(
      [slot({ recipeId: "soup", servings: 4 }), slot({ recipeId: "salad", servings: 1 })],
      recipes,
    );
    expect(needs).toEqual(
      new Map([
        [
          "pumpkin",
          {
            name: "pumpkin",
            amounts: [{ quantity: 1250, unit: "g" }],
            sources: ["pumpkin soup", "pumpkin salad"],
          },
        ],
        [
          "olive oil",
          {
            name: "olive oil",
            amounts: [{ quantity: 3, unit: "tbsp" }],
            sources: ["pumpkin soup", "pumpkin salad"],
          },
        ],
        [
          "salt-pepper",
          {
            name: "salt/pepper",
            amounts: [{ quantity: null, unit: "" }],
            sources: ["pumpkin soup", "pumpkin salad"],
          },
        ],
        [
          "stock",
          {
            name: "stock",
            amounts: [{ quantity: 700, unit: "ml" }],
            sources: ["pumpkin salad"],
          },
        ],
      ]),
    );
  });

  it("lists each recipe once as a source, across slots", () => {
    const needs = collectNeeds(
      [slot({ recipeId: "soup", servings: 4 }), slot({ recipeId: "soup", servings: 2 })],
      recipes,
    );
    expect(needs.get("pumpkin")).toEqual({
      name: "pumpkin",
      amounts: [{ quantity: 1500, unit: "g" }],
      sources: ["pumpkin soup"],
    });
  });

  it("skips empty ingredient names and deleted recipes", () => {
    const needs = collectNeeds(
      [slot({ recipeId: "soup", servings: 4 }, { recipeId: "gone", servings: 2 })],
      recipes,
    );
    expect([...needs.keys()]).toEqual(["pumpkin", "olive oil", "salt-pepper"]);
    expect(collectNeeds([slot({ recipeId: "gone", servings: 2 })], recipes).size).toBe(0);
  });
});

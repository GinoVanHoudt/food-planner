import { describe, expect, it } from "vite-plus/test";
import { filterRecipes, recipeTags } from "./filter";
import type { Recipe } from "./recipes";

function recipe(name: string, tags: string[], ingredients: string[]): Recipe {
  return {
    id: name,
    name,
    servings: 4,
    ingredients: ingredients.map((ingredient) => ({ name: ingredient, quantity: null, unit: "" })),
    instructions: "",
    sourceUrl: "",
    tags,
  };
}

const chili = recipe("chili sin carne", ["veggie", "spicy"], ["beans", "red onion"]);
const curry = recipe("chicken curry", ["spicy"], ["chicken", "coconut milk"]);
const salad = recipe("tomato salad", ["veggie", "quick"], ["tomatoes", "red onion"]);
const recipes = [chili, curry, salad];

describe("recipeTags", () => {
  it("lists every tag once, sorted", () => {
    expect(recipeTags(recipes)).toEqual(["quick", "spicy", "veggie"]);
    expect(recipeTags([])).toEqual([]);
  });
});

describe("filterRecipes", () => {
  it("shows everything without a search or tag", () => {
    expect(filterRecipes(recipes, "  ", null)).toEqual(recipes);
  });

  it("finds recipes by name or ingredient, whatever the case and spacing", () => {
    expect(filterRecipes(recipes, "CHILI  Sin", null)).toEqual([chili]);
    expect(filterRecipes(recipes, " red onion", null)).toEqual([chili, salad]);
    expect(filterRecipes(recipes, "coconut", null)).toEqual([curry]);
    expect(filterRecipes(recipes, "lasagna", null)).toEqual([]);
  });

  it("filters by tag, together with the search", () => {
    expect(filterRecipes(recipes, "", "spicy")).toEqual([chili, curry]);
    expect(filterRecipes(recipes, "onion", "spicy")).toEqual([chili]);
    expect(filterRecipes(recipes, "", "unused")).toEqual([]);
  });
});

import { dayRange, type DayKey } from "../../lib/dates";
import { byName } from "../../lib/sort";
import { addAmounts, ingredientKey, isCountable, scaleAmount, type Amount } from "../../lib/units";
import { MEALS, type DayPlan } from "../planner/types";
import type { Recipe } from "../recipes/recipes";

export interface GeneratedItem {
  name: string;
  amounts: Amount[];
  sectionId: string;
  /** Names of the recipes that need this ingredient. */
  sources: string[];
}

interface BuildListInput {
  days: Map<DayKey, DayPlan>;
  recipes: Map<string, Recipe>;
  from: DayKey;
  to: DayKey;
  sectionOf: (name: string) => string;
}

/** Whole items are rounded up (you can't buy 0.5 onion); other amounts to 2 decimals. */
function roundForShopping({ quantity, unit }: Amount): Amount {
  if (quantity === null) return { quantity, unit };
  return {
    quantity: isCountable(unit) ? Math.ceil(quantity - 1e-9) : Math.round(quantity * 100) / 100,
    unit,
  };
}

/**
 * Collects the ingredients of every recipe planned between `from` and `to`, scaled to the planned
 * servings, with the same ingredient (by name) merged and its amounts added up per unit.
 */
export function buildList({ days, recipes, from, to, sectionOf }: BuildListInput) {
  const groups = new Map<string, { name: string; amounts: Amount[]; sources: Set<string> }>();
  let mealCount = 0;

  for (const day of dayRange(from, to)) {
    for (const meal of MEALS) {
      const planned = days.get(day)?.[meal]?.recipes ?? [];
      if (planned.length > 0) mealCount++;
      for (const { recipeId, servings } of planned) {
        const recipe = recipes.get(recipeId);
        if (!recipe) continue;
        const factor = servings / (recipe.servings || 1);
        for (const ingredient of recipe.ingredients) {
          const key = ingredientKey(ingredient.name);
          if (!key) continue;
          const group = groups.get(key) ?? {
            name: ingredient.name.trim(),
            amounts: [],
            sources: new Set(),
          };
          group.amounts.push(scaleAmount(ingredient, factor));
          group.sources.add(recipe.name);
          groups.set(key, group);
        }
      }
    }
  }

  const items: GeneratedItem[] = [...groups.values()]
    .map((group) => ({
      name: group.name,
      amounts: addAmounts(group.amounts).map(roundForShopping),
      sectionId: sectionOf(group.name),
      sources: [...group.sources],
    }))
    .sort(byName);

  return { items, mealCount };
}

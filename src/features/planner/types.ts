import { addDays, type DayKey } from "../../lib/dates";
import { addAmounts, cleanName, ingredientKey, scaleAmount, type Amount } from "../../lib/units";
import type { StockLine } from "../inventory/stock";
import type { Recipe } from "../recipes/recipes";

export type Meal = "lunch" | "dinner";

export const MEALS: Meal[] = ["lunch", "dinner"];

export const MEAL_LABELS: Record<Meal, string> = { lunch: "Lunch", dinner: "Dinner" };

export interface PlannedRecipe {
  recipeId: string;
  servings: number;
}

export interface Slot {
  recipes: PlannedRecipe[];
  note: string;
  /** Marked as cooked: its ingredients were taken out of the inventory. */
  cooked?: boolean;
  /** What cooking took out of the inventory, put back if the meal is no longer cooked. */
  taken?: StockLine[];
}

/** One document per day, keyed by its DayKey. */
export interface DayPlan {
  id: DayKey;
  lunch?: Slot;
  dinner?: Slot;
}

export const EMPTY_SLOT: Slot = { recipes: [], note: "" };

export function isEmptySlot(slot: Slot | undefined): boolean {
  return !slot || (slot.recipes.length === 0 && !slot.note.trim());
}

/** The meal right before this one: lunch → previous day's dinner, dinner → same day's lunch. */
export function previousSlot(
  days: Map<DayKey, DayPlan>,
  day: DayKey,
  meal: Meal,
): Slot | undefined {
  return meal === "dinner" ? days.get(day)?.lunch : days.get(addDays(day, -1))?.dinner;
}

export function recipeNames(slot: Slot | undefined, recipes: Map<string, Recipe>): string[] {
  return (slot?.recipes ?? []).flatMap(({ recipeId }) => recipes.get(recipeId)?.name ?? []);
}

/** An ingredient that planned meals need, with its amounts added up per unit. */
export interface Need {
  name: string;
  amounts: Amount[];
  /** Names of the recipes that need it. */
  sources: string[];
}

/**
 * The ingredients of the recipes planned in `slots`, scaled to the planned servings and merged by
 * name (keyed by `ingredientKey`). Deleted recipes are skipped.
 */
export function collectNeeds(slots: Slot[], recipes: Map<string, Recipe>): Map<string, Need> {
  const groups = new Map<string, { name: string; amounts: Amount[]; sources: Set<string> }>();
  for (const slot of slots) {
    for (const { recipeId, servings } of slot.recipes) {
      const recipe = recipes.get(recipeId);
      if (!recipe) continue;
      const factor = servings / (recipe.servings || 1);
      for (const ingredient of recipe.ingredients) {
        const key = ingredientKey(ingredient.name);
        if (!key) continue;
        const group = groups.get(key) ?? {
          name: cleanName(ingredient.name),
          amounts: [],
          sources: new Set(),
        };
        group.amounts.push(scaleAmount(ingredient, factor));
        group.sources.add(cleanName(recipe.name));
        groups.set(key, group);
      }
    }
  }
  return new Map(
    [...groups].map(([key, group]) => [
      key,
      { name: group.name, amounts: addAmounts(group.amounts), sources: [...group.sources] },
    ]),
  );
}

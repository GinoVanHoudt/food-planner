import { addDays, type DayKey } from "../../lib/dates";
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

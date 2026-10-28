import { addDays, formatNearDay, type DayKey } from "../../lib/dates";
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
  /** Names of full meals from the inventory, like a frozen soup, that are eaten whole. */
  fromInventory?: string[];
  note: string;
  /** Marked as cooked: its ingredients and meals were taken out of the inventory. */
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

/** Has recipes or meals from the inventory, so there is something to mark cooked. */
export function hasFood(slot: Slot): boolean {
  return slot.recipes.length > 0 || (slot.fromInventory ?? []).length > 0;
}

export function isEmptySlot(slot: Slot | undefined): boolean {
  return !slot || (!hasFood(slot) && !slot.note.trim());
}

/** How many meals on `keys` have something planned: food or a note. */
export function plannedCount(days: Map<DayKey, DayPlan>, keys: DayKey[]): number {
  return keys.flatMap((day) => MEALS.filter((meal) => !isEmptySlot(days.get(day)?.[meal]))).length;
}

/** The meal right before this one: lunch → previous day's dinner, dinner → same day's lunch. */
export function previousSlot(
  days: Map<DayKey, DayPlan>,
  day: DayKey,
  meal: Meal,
): Slot | undefined {
  return meal === "dinner" ? days.get(day)?.lunch : days.get(addDays(day, -1))?.dinner;
}

/**
 * The days each recipe (by id) and inventory meal (by name) is planned on from `today`, in meals
 * that are not cooked yet, leaving out the meal `skip` that is being edited.
 */
export function upcomingPlans(
  days: Map<DayKey, DayPlan>,
  today: DayKey,
  skip: { day: DayKey; meal: Meal },
) {
  const recipes = new Map<string, DayKey[]>();
  const fromInventory = new Map<string, DayKey[]>();
  const add = (plans: Map<string, DayKey[]>, key: string, day: DayKey) => {
    const planned = plans.get(key) ?? [];
    if (planned.at(-1) !== day) plans.set(key, [...planned, day]);
  };
  for (const day of [...days.keys()].filter((day) => day >= today).sort()) {
    for (const meal of MEALS) {
      const slot = days.get(day)?.[meal];
      if (!slot || slot.cooked || (day === skip.day && meal === skip.meal)) continue;
      for (const { recipeId } of slot.recipes) add(recipes, recipeId, day);
      for (const name of slot.fromInventory ?? []) add(fromInventory, name, day);
    }
  }
  return { recipes, fromInventory };
}

/** e.g. "Planned today, Fri" for days from `upcomingPlans`, or undefined if there are none. */
export function plannedLabel(days: DayKey[] | undefined, today: DayKey): string | undefined {
  return days?.length
    ? `Planned ${days.map((day) => formatNearDay(day, today)).join(", ")}`
    : undefined;
}

export function recipeNames(slot: Slot | undefined, recipes: Map<string, Recipe>): string[] {
  return (slot?.recipes ?? []).flatMap(({ recipeId }) => recipes.get(recipeId)?.name ?? []);
}

/** The note for eating the previous meal's leftovers: "Leftovers: chili + rice", or "Leftovers". */
export function leftoversNote(names: string[]): string {
  return names.length > 0 ? `Leftovers: ${names.join(" + ")}` : "Leftovers";
}

/** Whether a note, picked or typed, is about leftovers. */
export function isLeftoversNote(note: string): boolean {
  return note.trim().toLowerCase().startsWith("leftovers");
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

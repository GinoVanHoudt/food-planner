import { addDays, dayRange, type DayKey } from "../../lib/dates";
import { byName } from "../../lib/sort";
import { isCountable, type Amount } from "../../lib/units";
import { applyChanges, consume, take, type Stock } from "../inventory/stock";
import { collectNeeds, MEALS, type DayPlan, type Slot } from "../planner/types";
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
  /** Meals from today until `from` that are not cooked yet will still use some of the stock. */
  today: DayKey;
  stock: Stock;
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

/** The meals with recipes from `from` to `to` (inclusive) that are not cooked yet. */
function mealsToCook(days: Map<DayKey, DayPlan>, from: DayKey, to: DayKey): Slot[] {
  return dayRange(from, to).flatMap((day) =>
    MEALS.flatMap((meal) => {
      const slot = days.get(day)?.[meal];
      return slot && slot.recipes.length > 0 && !slot.cooked ? [slot] : [];
    }),
  );
}

/**
 * Collects the ingredients of every meal planned between `from` and `to` that is not cooked yet,
 * scaled to the planned servings and merged by name, minus what is already at home. The stock that
 * the meals before `from` will use is set aside first.
 */
export function buildList({ days, recipes, from, to, today, stock, sectionOf }: BuildListInput) {
  const before = mealsToCook(days, today, addDays(from, -1));
  const available = applyChanges(stock, consume(stock, collectNeeds(before, recipes)).changes);

  const meals = mealsToCook(days, from, to);
  const items: GeneratedItem[] = [];
  let atHome = 0;
  for (const [key, need] of collectNeeds(meals, recipes)) {
    const amounts = take(available.get(key), need.amounts)
      .missing.map(roundForShopping)
      // Leftovers too small to show (e.g. 0.001 g after scaling) do not need buying.
      .filter(({ quantity }) => quantity !== 0);
    if (amounts.length === 0) {
      atHome++;
      continue;
    }
    items.push({
      name: need.name,
      amounts,
      sectionId: sectionOf(need.name),
      sources: need.sources,
    });
  }

  return { items: items.sort(byName), mealCount: meals.length, atHome };
}

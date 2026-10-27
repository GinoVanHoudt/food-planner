import { addAmounts, ingredientKey, subtractAmounts, type Amount } from "../../lib/units";
import { collectNeeds, type Need, type Slot } from "../planner/types";
import type { Recipe } from "../recipes/recipes";

/** Something at home. No amounts means "we have some"; `always` items are never used up. */
export interface StockItem {
  name: string;
  amounts: Amount[];
  always: boolean;
}

/** The inventory by `ingredientKey`. */
export type Stock = Map<string, StockItem>;

/** Inventory items to save by key, or null to delete them. */
export type StockChanges = Map<string, StockItem | null>;

/** An ingredient with amounts, like a bought item or what cooking a meal took. */
export interface StockLine {
  name: string;
  amounts: Amount[];
}

interface Taken {
  /** The item after taking, or undefined if there is none (left). */
  item: StockItem | undefined;
  taken: Amount[];
  missing: Amount[];
}

/**
 * Takes amounts of one ingredient from its stock item. Always-available items and items without
 * amounts cover any need and stay as they are; an item that is used up is gone.
 */
export function take(item: StockItem | undefined, amounts: Amount[]): Taken {
  if (!item) return { item, taken: [], missing: amounts };
  if (item.always || item.amounts.length === 0) return { item, taken: [], missing: [] };
  const { left, taken, missing } = subtractAmounts(item.amounts, amounts);
  return { item: left.length > 0 ? { ...item, amounts: left } : undefined, taken, missing };
}

/** Takes what meals need out of the stock. Returns the changes and what was taken. */
export function consume(stock: Stock, needs: Map<string, Need>) {
  const changes: StockChanges = new Map();
  const taken: StockLine[] = [];
  for (const [key, need] of needs) {
    const result = take(stock.get(key), need.amounts);
    if (result.taken.length === 0) continue;
    changes.set(key, result.item ?? null);
    taken.push({ name: need.name, amounts: result.taken });
  }
  return { changes, taken };
}

/** The stock with the changes applied. */
export function applyChanges(stock: Stock, changes: StockChanges): Stock {
  const next = new Map(stock);
  for (const [key, item] of changes) {
    if (item) next.set(key, item);
    else next.delete(key);
  }
  return next;
}

/**
 * Adds lines to the stock, merged into the item with the same name. A line without quantities just
 * means "some", so it only adds the item if there is none yet. Always-available items stay as they are.
 */
export function addToStock(stock: Stock, lines: StockLine[]): StockChanges {
  const changes: StockChanges = new Map();
  for (const line of lines) {
    const key = ingredientKey(line.name);
    const item = changes.get(key) ?? stock.get(key);
    if (!key || item?.always) continue;
    const amounts = line.amounts.filter((amount) => amount.quantity !== null);
    changes.set(key, {
      name: item?.name ?? line.name.trim(),
      amounts: addAmounts([...(item?.amounts ?? []), ...amounts]),
      always: false,
    });
  }
  return changes;
}

/**
 * An item after editing its amounts and "always" flag, or null if it is used up (amounts were typed
 * but they are all 0). No amounts means "we have some"; always-available items keep none.
 */
export function editedItem(name: string, amounts: Amount[], always: boolean): StockItem | null {
  if (always) return { name, amounts: [], always };
  const left = amounts.filter(({ quantity }) => quantity !== null && quantity > 0);
  return amounts.length > 0 && left.length === 0 ? null : { name, amounts: left, always };
}

function sameRecipes(a: Slot, b: Slot): boolean {
  return (
    a.recipes.length === b.recipes.length &&
    a.recipes.every(
      ({ recipeId, servings }, index) =>
        recipeId === b.recipes[index].recipeId && servings === b.recipes[index].servings,
    )
  );
}

/**
 * Saving a meal that became cooked takes its ingredients out of the stock; a meal that is no longer
 * cooked (or lost its recipes) gets back what was taken. A cooked meal whose recipes or servings
 * changed gets back what was taken and then takes what it needs now. Returns the slot to save and
 * the changes.
 */
export function cookMeal(
  before: Slot,
  after: Slot,
  recipes: Map<string, Recipe>,
  stock: Stock,
): { slot: Slot; changes: StockChanges } {
  const plain: Slot = { recipes: after.recipes, note: after.note };
  const wasCooked = Boolean(before.cooked);
  const isCooked = Boolean(after.cooked) && after.recipes.length > 0;
  if (wasCooked && isCooked && sameRecipes(before, after)) {
    return { slot: { ...plain, cooked: true, taken: before.taken ?? [] }, changes: new Map() };
  }
  const putBack: StockChanges = wasCooked ? addToStock(stock, before.taken ?? []) : new Map();
  if (!isCooked) return { slot: plain, changes: putBack };
  const { changes, taken } = consume(applyChanges(stock, putBack), collectNeeds([after], recipes));
  return { slot: { ...plain, cooked: true, taken }, changes: new Map([...putBack, ...changes]) };
}

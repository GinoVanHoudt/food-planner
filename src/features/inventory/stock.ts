import { addDays, formatDate, relativeDayName, type DayKey } from "../../lib/dates";
import { addAmounts, ingredientKey, subtractAmounts, type Amount } from "../../lib/units";
import { collectNeeds, hasFood, type Need, type Slot } from "../planner/types";
import type { Recipe } from "../recipes/recipes";

/** Something at home. No amounts means "we have some"; `always` items are never used up. */
export interface StockItem {
  name: string;
  amounts: Amount[];
  always: boolean;
  /** The day it expires, if it has a date. */
  expires?: DayKey;
}

/** The inventory by `ingredientKey`. */
export type Stock = Map<string, StockItem>;

/** Inventory items to save by key, or null to delete them. */
export type StockChanges = Map<string, StockItem | null>;

/** An ingredient with amounts, like a bought item or what cooking a meal took. */
export interface StockLine {
  name: string;
  amounts: Amount[];
  /** Its expiry date, so an item that is put back gets it back. */
  expires?: DayKey;
}

/**
 * `{ expires }` to spread into an item or line, or nothing for no (or an empty) date: Firestore
 * rejects undefined fields.
 */
export function expiresField(expires: DayKey | undefined): { expires?: DayKey } {
  return expires ? { expires } : {};
}

/** The earlier of two dates, either of which may be missing. */
function earliest(a: DayKey | undefined, b: DayKey | undefined): DayKey | undefined {
  return a && b ? (a < b ? a : b) : a || b;
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
    const item = stock.get(key);
    const result = take(item, need.amounts);
    if (result.taken.length === 0) continue;
    changes.set(key, result.item ?? null);
    taken.push({ name: need.name, amounts: result.taken, ...expiresField(item?.expires) });
  }
  return { changes, taken };
}

/** Takes full meals (by name) out of the stock whole. Returns the changes and what was taken. */
export function takeWhole(stock: Stock, names: string[]) {
  const changes: StockChanges = new Map();
  const taken: StockLine[] = [];
  for (const name of names) {
    const key = ingredientKey(name);
    const item = stock.get(key);
    if (!item || item.always) continue;
    changes.set(key, null);
    taken.push({ name: item.name, amounts: item.amounts, ...expiresField(item.expires) });
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
 * means "some", so it only adds the item if there is none yet. The earliest expiry date stays.
 * Always-available items stay as they are.
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
      ...expiresField(earliest(item?.expires, line.expires)),
    });
  }
  return changes;
}

/**
 * An item after editing, or null if it is used up (amounts were typed but they are all 0). No
 * amounts means "we have some"; always-available items keep no amounts or date.
 */
export function editedItem({ name, amounts, always, expires }: StockItem): StockItem | null {
  if (always) return { name, amounts: [], always };
  const left = amounts.filter(({ quantity }) => quantity !== null && quantity > 0);
  return amounts.length > 0 && left.length === 0
    ? null
    : { name, amounts: left, always, ...expiresField(expires) };
}

/** Items expiring within this many days (today included) are shown as expiring soon. */
const EXPIRES_SOON_DAYS = 3;

/** How an expiry date is shown, e.g. "Expires 4 Nov", and whether it is soon or past. */
export function expiry(expires: DayKey, today: DayKey) {
  if (expires < today) return { label: "Expired", state: "expired" };
  const when = relativeDayName(expires, today)?.toLowerCase() ?? formatDate(expires, today);
  const state = expires < addDays(today, EXPIRES_SOON_DAYS) ? "soon" : "later";
  return { label: `Expires ${when}`, state };
}

/** Soonest expiry first; items without a date last. */
export function byExpiry(a: StockItem, b: StockItem): number {
  const first = a.expires ?? "9999-12-31";
  const second = b.expires ?? "9999-12-31";
  return first < second ? -1 : first > second ? 1 : 0;
}

function sameFood(a: Slot, b: Slot): boolean {
  const aMeals = a.fromInventory ?? [];
  const bMeals = b.fromInventory ?? [];
  return (
    a.recipes.length === b.recipes.length &&
    a.recipes.every(
      ({ recipeId, servings }, index) =>
        recipeId === b.recipes[index].recipeId && servings === b.recipes[index].servings,
    ) &&
    aMeals.length === bMeals.length &&
    aMeals.every((name, index) => name === bMeals[index])
  );
}

/**
 * Saving a meal that became cooked takes its ingredients, and its full meals from the inventory
 * whole, out of the stock; a meal that is no longer cooked (or lost its food) gets back what was
 * taken. A cooked meal whose recipes, servings or inventory meals changed gets back what was taken
 * and then takes what it needs now. Returns the slot to save and the changes.
 */
export function cookMeal(
  before: Slot,
  after: Slot,
  recipes: Map<string, Recipe>,
  stock: Stock,
): { slot: Slot; changes: StockChanges } {
  const fromInventory = after.fromInventory ?? [];
  const plain: Slot = {
    recipes: after.recipes,
    ...(fromInventory.length > 0 && { fromInventory }),
    note: after.note,
  };
  const wasCooked = Boolean(before.cooked);
  const isCooked = Boolean(after.cooked) && hasFood(after);
  if (wasCooked && isCooked && sameFood(before, after)) {
    return { slot: { ...plain, cooked: true, taken: before.taken ?? [] }, changes: new Map() };
  }
  const putBack: StockChanges = wasCooked ? addToStock(stock, before.taken ?? []) : new Map();
  if (!isCooked) return { slot: plain, changes: putBack };
  const available = applyChanges(stock, putBack);
  const meals = takeWhole(available, fromInventory);
  const used = consume(applyChanges(available, meals.changes), collectNeeds([after], recipes));
  return {
    slot: { ...plain, cooked: true, taken: [...meals.taken, ...used.taken] },
    changes: new Map([...putBack, ...meals.changes, ...used.changes]),
  };
}

export interface Amount {
  quantity: number | null;
  unit: string;
}

export interface Ingredient extends Amount {
  name: string;
}

/** Longest recipe, ingredient or shopping item name that the Firestore rules accept. */
export const MAX_NAME_LENGTH = 200;

export const COMMON_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "pcs",
  "tsp",
  "tbsp",
  "cloves",
  "cans",
  "pack",
  "bunch",
  "pinch",
];

const UNIT_ALIASES: Record<string, string[]> = {
  g: ["g", "gr", "gram", "grams"],
  kg: ["kg", "kilo", "kilos", "kilogram", "kilograms"],
  ml: ["ml", "milliliter", "millilitre", "milliliters", "millilitres"],
  cl: ["cl"],
  dl: ["dl"],
  l: ["l", "ltr", "liter", "litre", "liters", "litres"],
  tsp: ["tsp", "tsps", "teaspoon", "teaspoons"],
  tbsp: ["tbsp", "tbsps", "tbs", "tablespoon", "tablespoons"],
  pcs: ["pc", "pcs", "piece", "pieces"],
  cloves: ["clove", "cloves"],
  cans: ["can", "cans", "tin", "tins"],
  pack: ["pack", "packs", "packet", "packets"],
  jar: ["jar", "jars"],
  bunch: ["bunch", "bunches"],
  slices: ["slice", "slices"],
  pinch: ["pinch", "pinches"],
  cups: ["cup", "cups"],
  portions: ["portion", "portions"],
};

const UNIT_LOOKUP = new Map(
  Object.entries(UNIT_ALIASES).flatMap(([unit, aliases]) => aliases.map((alias) => [alias, unit])),
);

/** Metric units are converted to grams / millilitres so they can be added up. */
const BASE_UNITS: Record<string, { unit: string; factor: number }> = {
  g: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  cl: { unit: "ml", factor: 10 },
  dl: { unit: "ml", factor: 100 },
  l: { unit: "ml", factor: 1000 },
};

/** Units you buy whole, so shopping quantities are rounded up. */
const COUNTABLE_UNITS = new Set(["", "pcs", "cloves", "cans", "pack", "jar", "bunch", "portions"]);

export function normalizeUnit(unit: string): string {
  const cleaned = unit.trim().toLowerCase().replace(/\.$/, "");
  return UNIT_LOOKUP.get(cleaned) ?? cleaned;
}

export function isCountable(unit: string): boolean {
  return COUNTABLE_UNITS.has(normalizeUnit(unit));
}

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": " 1/2",
  "¼": " 1/4",
  "¾": " 3/4",
  "⅓": " 1/3",
  "⅔": " 2/3",
};

/** "1½" → "1 1/2", "½" → "1/2". */
function expandFractions(text: string): string {
  return text.replace(/[½¼¾⅓⅔]/g, (fraction) => UNICODE_FRACTIONS[fraction]).trim();
}

/** Parses "2", "1,5", "1/2", "1 1/2" and "1½". Returns null for empty or invalid input. */
export function parseQuantity(text: string): number | null {
  const cleaned = expandFractions(text).replace(",", ".");
  if (!cleaned) return null;
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(cleaned);
  const fraction = /^(\d+)\/(\d+)$/.exec(cleaned);
  const value = mixed
    ? Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
    : fraction
      ? Number(fraction[1]) / Number(fraction[2])
      : Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Parses free text like "200 g onions", "2kg potatoes", "3 eggs" or "salt". The name is cleaned. */
export function parseIngredientLine(line: string): Ingredient {
  const match = /^\s*(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+)?)\s*(.*)$/.exec(expandFractions(line));
  if (!match) return { name: cleanName(line), quantity: null, unit: "" };
  const quantity = parseQuantity(match[1]);
  const rest = match[2].trim();
  const unitMatch = /^([a-zA-Z]+\.?)\s+(.+)$/.exec(rest);
  if (unitMatch && UNIT_LOOKUP.has(unitMatch[1].toLowerCase().replace(/\.$/, ""))) {
    return { name: cleanName(unitMatch[2]), quantity, unit: normalizeUnit(unitMatch[1]) };
  }
  return { name: cleanName(rest), quantity, unit: "" };
}

export function scaleAmount(amount: Amount, factor: number): Amount {
  return { ...amount, quantity: amount.quantity === null ? null : amount.quantity * factor };
}

function toBaseAmount({ quantity, unit }: Amount): Amount {
  const normalized = normalizeUnit(unit);
  const base = BASE_UNITS[normalized];
  if (!base) return { quantity, unit: normalized };
  return { quantity: quantity === null ? null : quantity * base.factor, unit: base.unit };
}

/** Adds amounts per unit (after converting metric units), keeping the order units first appear in. */
export function addAmounts(amounts: Amount[]): Amount[] {
  const totals = new Map<string, number | null>();
  for (const amount of amounts) {
    const { quantity, unit } = toBaseAmount(amount);
    const total = totals.get(unit) ?? null;
    totals.set(unit, quantity === null ? total : (total ?? 0) + quantity);
  }
  return [...totals].map(([unit, quantity]) => ({ quantity, unit }));
}

/** Leftovers below this are rounding noise from converting and scaling. */
const EPSILON = 1e-9;

/**
 * Takes `need` out of `have`, per unit (after converting metric units). Returns what is `left`, what
 * was `taken` and what is still `missing`. A unit that is not in `have` cannot be taken, and a need
 * without a quantity is covered by having any amount at all.
 */
export function subtractAmounts(have: Amount[], need: Amount[]) {
  const left = new Map(addAmounts(have).map(({ quantity, unit }) => [unit, quantity]));
  const taken: Amount[] = [];
  const missing: Amount[] = [];
  for (const { quantity, unit } of addAmounts(need)) {
    const available = left.get(unit);
    if (quantity === null) {
      if (left.size === 0) missing.push({ quantity, unit });
    } else if (available === undefined) {
      missing.push({ quantity, unit });
    } else if (available !== null) {
      const used = Math.min(available, quantity);
      left.set(unit, available - used);
      if (used > EPSILON) taken.push({ quantity: used, unit });
      if (quantity - used > EPSILON) missing.push({ quantity: quantity - used, unit });
    }
  }
  return {
    left: [...left]
      .filter(([, quantity]) => quantity === null || quantity > EPSILON)
      .map(([unit, quantity]) => ({ quantity, unit })),
    taken,
    missing,
  };
}

/**
 * Parses amounts typed on their own, like "500 g", "3", "1.5 kg" or "1 kg + 2 pcs" (the format
 * `formatAmounts` writes). Returns an empty list for empty text and null if a part is not an amount.
 */
export function parseAmounts(text: string): Amount[] | null {
  if (!text.trim()) return [];
  const amounts: Amount[] = [];
  for (const part of text.split("+")) {
    const match = /^\s*(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+)?)\s*([a-zA-Z]*\.?)\s*$/.exec(
      expandFractions(part),
    );
    const quantity = match && parseQuantity(match[1]);
    if (!match || quantity === null) return null;
    amounts.push({ quantity, unit: normalizeUnit(match[2]) });
  }
  return addAmounts(amounts);
}

export function formatQuantity(quantity: number): string {
  return String(Math.round(quantity * 100) / 100);
}

/** e.g. "400 g", "1.5 kg", "2", "pinch". Large gram / millilitre amounts switch to kg / l. */
export function formatAmount({ quantity, unit }: Amount): string {
  if (quantity === null) return unit;
  const normalized = normalizeUnit(unit);
  if (normalized === "g" && quantity >= 1000) return `${formatQuantity(quantity / 1000)} kg`;
  if (normalized === "ml" && quantity >= 1000) return `${formatQuantity(quantity / 1000)} l`;
  return unit ? `${formatQuantity(quantity)} ${unit}` : formatQuantity(quantity);
}

export function formatAmounts(amounts: Amount[]): string {
  return amounts.map(formatAmount).filter(Boolean).join(" + ");
}

/**
 * A recipe, ingredient or item name as it is saved: trimmed and in lower case, so names typed on a
 * phone (which capitalises the first letter) and on a computer are the same.
 */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** A saved name as shown: "chili sin carne" → "Chili sin carne". */
export function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Stable key for an ingredient name, also used as its Firestore document id. */
export function ingredientKey(name: string): string {
  const key = cleanName(name).replaceAll("/", "-");
  // Firestore rejects the document ids ".", ".." and "__…__".
  return /^\.{1,2}$|^__.*__$/.test(key) ? `~${key}` : key;
}

import {
  cleanName,
  MAX_NAME_LENGTH,
  normalizeUnit,
  parseIngredientLine,
  parseQuantity,
  type Ingredient,
} from "../../lib/units";

/** An ingredient row of the recipe form, as typed. */
export interface IngredientRow {
  quantity: string;
  unit: string;
  name: string;
}

/** The rows as saved: cleaned, with parsed quantities. Rows without a name are left out. */
export function toIngredients(rows: IngredientRow[]): Ingredient[] {
  return rows
    .filter((row) => row.name.trim())
    .map((row) => ({
      name: cleanName(row.name),
      quantity: parseQuantity(row.quantity),
      unit: normalizeUnit(row.unit),
    }));
}

/** A pasted ingredient list, one per line. Bullets and empty lines are skipped. */
export function parseIngredientList(text: string): Ingredient[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*\s]+/, ""))
    .filter((line) => line.trim())
    .map((line) => parseIngredientLine(line))
    .map((ingredient) => ({ ...ingredient, name: ingredient.name.slice(0, MAX_NAME_LENGTH) }));
}

/** A typed link as saved, with `https://` added if it has no scheme. */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** The link if it is a web page, else "": never render e.g. a javascript: URL as a link. */
export function webUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "";
}

/** "https://www.example.com/chili" → "example.com". */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

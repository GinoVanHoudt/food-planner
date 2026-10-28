import { compareNames } from "../../lib/sort";
import { cleanName, ingredientKey } from "../../lib/units";
import type { CatalogEntry } from "./catalog";

/**
 * Finds ingredients in the catalog by name, whatever their case or spacing. Unknown ingredients
 * are in the `fallback` section and location, and are not a meal.
 */
export function catalogLookup(
  entries: CatalogEntry[],
  fallback: { sectionId: string; locationId: string },
) {
  const byKey = new Map(entries.map((entry) => [entry.id, entry]));
  const find = (name: string) => byKey.get(ingredientKey(name));
  return {
    names: entries.map((entry) => entry.name).sort(compareNames),
    sectionOf: (name: string) => find(name)?.sectionId ?? fallback.sectionId,
    locationOf: (name: string) => find(name)?.locationId ?? fallback.locationId,
    isMeal: (name: string) => Boolean(find(name)?.meal),
    has: (name: string) => find(name) !== undefined,
  };
}

/** The names that are not in the catalog yet, cleaned and by key. Empty names are left out. */
export function unknownIngredients(
  names: string[],
  isKnown: (name: string) => boolean,
): Map<string, string> {
  return new Map(
    names
      .filter((name) => name.trim() && !isKnown(name))
      .map((name) => [ingredientKey(name), cleanName(name)]),
  );
}

import { cleanName } from "../../lib/units";
import type { Recipe } from "./recipes";

/** Every tag the recipes use, sorted. */
export function recipeTags(recipes: Recipe[]): string[] {
  return [...new Set(recipes.flatMap((recipe) => recipe.tags))].sort();
}

/** The recipes with `tag` (if any) whose name or an ingredient contains the search text. */
export function filterRecipes(recipes: Recipe[], query: string, tag: string | null): Recipe[] {
  const search = cleanName(query);
  return recipes.filter(
    (recipe) =>
      (!tag || recipe.tags.includes(tag)) &&
      (!search ||
        recipe.name.toLowerCase().includes(search) ||
        recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(search))),
  );
}

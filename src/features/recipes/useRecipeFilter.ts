import { useMemo, useState } from "react";
import type { Recipe } from "./recipes";

/** Search (name or ingredient) and tag filter state, shared by the recipe list and the meal picker. */
export function useRecipeFilter(recipes: Recipe[]) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(
    () => [...new Set(recipes.flatMap((recipe) => recipe.tags))].sort(),
    [recipes],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return recipes.filter(
      (recipe) =>
        (!tag || recipe.tags.includes(tag)) &&
        (!search ||
          recipe.name.toLowerCase().includes(search) ||
          recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(search))),
    );
  }, [recipes, query, tag]);

  return { query, setQuery, tag, setTag, tags, filtered };
}

export type RecipeFilter = ReturnType<typeof useRecipeFilter>;

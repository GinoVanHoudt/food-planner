import { useMemo, useState } from "react";
import { filterRecipes, recipeTags } from "./filter";
import type { Recipe } from "./recipes";

/** Search (name or ingredient) and tag filter state, shared by the recipe list and the meal picker. */
export function useRecipeFilter(recipes: Recipe[]) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => recipeTags(recipes), [recipes]);

  const filtered = useMemo(() => filterRecipes(recipes, query, tag), [recipes, query, tag]);

  return { query, setQuery, tag, setTag, tags, filtered };
}

export type RecipeFilter = ReturnType<typeof useRecipeFilter>;

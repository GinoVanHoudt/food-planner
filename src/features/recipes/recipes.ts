import { collection, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
import { liveCollection, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
import { byName } from "../../lib/sort";
import type { Ingredient } from "../../lib/units";

export interface Recipe {
  id: string;
  name: string;
  /** Number of servings the ingredient quantities are written for. */
  servings: number;
  ingredients: Ingredient[];
  instructions: string;
  sourceUrl: string;
  tags: string[];
}

export type RecipeInput = Omit<Recipe, "id">;

export const DEFAULT_SERVINGS = 4;

const recipesStore = liveCollection<Recipe>(() => collection(db, "recipes"));

export function useRecipes() {
  const { data, loading } = useLive(recipesStore);
  return useMemo(() => {
    const recipes = [...data].sort(byName);
    return { recipes, byId: new Map(recipes.map((recipe) => [recipe.id, recipe])), loading };
  }, [data, loading]);
}

/** Creates or overwrites a recipe and returns its id. */
export function saveRecipe(id: string | undefined, input: RecipeInput): string {
  const ref = id ? doc(db, "recipes", id) : doc(collection(db, "recipes"));
  persist(setDoc(ref, { ...input, updatedAt: serverTimestamp() }), "Saving recipe");
  return ref.id;
}

export function deleteRecipe(id: string) {
  persist(deleteDoc(doc(db, "recipes", id)), "Deleting recipe");
}

import { CookingPot, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { plural } from "../../lib/plural";
import { capitalize } from "../../lib/units";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { EmptyState } from "../../ui/EmptyState";
import { Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { RecipeFilterBar } from "./RecipeFilterBar";
import { useRecipes } from "./recipes";
import s from "./RecipesPage.module.css";
import { useRecipeFilter } from "./useRecipeFilter";

export function RecipesPage() {
  const { recipes, loading } = useRecipes();
  const filter = useRecipeFilter(recipes);
  const navigate = useNavigate();
  const addRecipe = () => navigate("/recipes/new");

  return (
    <>
      <PageHeader
        title="Recipes"
        subtitle={loading ? undefined : plural(recipes.length, "recipe")}
        actions={
          <Button variant="primary" size="sm" icon={<Plus />} onClick={addRecipe}>
            New
          </Button>
        }
      />
      <Page>
        {!loading && recipes.length === 0 ? (
          <EmptyState
            icon={<CookingPot />}
            title="No recipes yet"
            text="Add the dishes you like to cook, then plan them for the coming days."
          >
            <Button variant="primary" icon={<Plus />} onClick={addRecipe}>
              Add a recipe
            </Button>
          </EmptyState>
        ) : (
          <>
            <RecipeFilterBar filter={filter} />
            <ul className={s.list}>
              <AnimatePresence initial={false} mode="popLayout">
                {filter.filtered.map((recipe, index) => (
                  <motion.li
                    key={recipe.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: Math.min(index, 10) * 0.02 },
                    }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <Link to={`/recipes/${recipe.id}`} className={s.card}>
                      <span className={s.name}>{capitalize(recipe.name)}</span>
                      <span className={s.meta}>
                        {plural(recipe.ingredients.length, "ingredient")} · serves {recipe.servings}
                      </span>
                      {recipe.tags.length > 0 && (
                        <span className={s.tags}>
                          {recipe.tags.map((tag) => (
                            <Chip key={tag}>{tag}</Chip>
                          ))}
                        </span>
                      )}
                    </Link>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {!loading && filter.filtered.length === 0 && (
              <p className={s.noResults}>No recipes match your search.</p>
            )}
          </>
        )}
      </Page>
    </>
  );
}

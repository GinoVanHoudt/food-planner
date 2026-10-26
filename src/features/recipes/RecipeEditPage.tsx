import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "../../ui/Button";
import { Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { rememberIngredients, useCatalog } from "../ingredients/catalog";
import { RecipeForm } from "./RecipeForm";
import { saveRecipe, useRecipes, type RecipeInput } from "./recipes";

const FORM_ID = "recipe-form";

export function RecipeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, byId, loading } = useRecipes();
  const catalog = useCatalog();
  const recipe = id ? byId.get(id) : undefined;
  const tagSuggestions = useMemo(
    () => [...new Set(recipes.flatMap((other) => other.tags))].sort(),
    [recipes],
  );

  const onSubmit = (input: RecipeInput) => {
    const savedId = saveRecipe(id, input);
    rememberIngredients(
      input.ingredients.map((ingredient) => ingredient.name),
      catalog.has,
    );
    void navigate(`/recipes/${savedId}`, { replace: true });
  };

  const backTo = id ? `/recipes/${id}` : "/recipes";
  const waitingForRecipe = Boolean(id) && !recipe;

  return (
    <>
      <PageHeader
        title={id ? "Edit recipe" : "New recipe"}
        backTo={backTo}
        actions={
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            size="sm"
            disabled={waitingForRecipe}
          >
            Save
          </Button>
        }
      />
      <Page>
        {waitingForRecipe ? (
          !loading && <p>Recipe not found.</p>
        ) : (
          <RecipeForm
            key={recipe?.id ?? "new"}
            id={FORM_ID}
            initial={recipe}
            ingredientNames={catalog.names}
            tagSuggestions={tagSuggestions}
            onSubmit={onSubmit}
          />
        )}
      </Page>
    </>
  );
}

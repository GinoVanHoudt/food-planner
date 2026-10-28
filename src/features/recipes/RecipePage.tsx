import { CookingPot, ExternalLink, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { capitalize, formatAmount, scaleAmount } from "../../lib/units";
import { IconButton } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { EmptyState } from "../../ui/EmptyState";
import { Card, Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { Stepper } from "../../ui/Stepper";
import { deleteRecipe, useRecipes } from "./recipes";
import s from "./RecipePage.module.css";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function RecipePage() {
  const { id = "" } = useParams();
  const { byId, loading } = useRecipes();
  const navigate = useNavigate();
  const [servings, setServings] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const recipe = byId.get(id);

  if (!recipe) {
    return (
      <>
        <PageHeader title="Recipe" backTo="/recipes" />
        {!loading && <EmptyState icon={<CookingPot />} title="Recipe not found" />}
      </>
    );
  }

  const shownServings = servings ?? recipe.servings;
  const factor = shownServings / recipe.servings;
  // Only link to web pages; never render e.g. a javascript: URL as a link.
  const sourceUrl = /^https?:\/\//i.test(recipe.sourceUrl) ? recipe.sourceUrl : "";

  return (
    <>
      <PageHeader
        title={capitalize(recipe.name)}
        backTo="/recipes"
        actions={
          <>
            <IconButton label="Edit recipe" onClick={() => navigate(`/recipes/${id}/edit`)}>
              <Pencil />
            </IconButton>
            <IconButton label="Delete recipe" onClick={() => setConfirmDelete(true)}>
              <Trash />
            </IconButton>
          </>
        }
      />
      <Page>
        {(recipe.tags.length > 0 || sourceUrl) && (
          <div className={s.meta}>
            {recipe.tags.length > 0 && (
              <ChipRow>
                {recipe.tags.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </ChipRow>
            )}
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className={s.source}>
                <ExternalLink aria-hidden />
                {hostname(sourceUrl)}
              </a>
            )}
          </div>
        )}
        <div className={s.columns}>
          <Card
            title="Ingredients"
            actions={<Stepper label="Servings" value={shownServings} onChange={setServings} />}
          >
            {recipe.ingredients.length === 0 ? (
              <p className={s.muted}>No ingredients added.</p>
            ) : (
              <ul className={s.ingredients}>
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>
                    <span className={s.amount}>
                      {formatAmount(scaleAmount(ingredient, factor))}
                    </span>
                    <span>{capitalize(ingredient.name)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Instructions">
            {recipe.instructions ? (
              <p className={s.instructions}>{recipe.instructions}</p>
            ) : (
              <p className={s.muted}>No instructions added.</p>
            )}
          </Card>
        </div>
      </Page>
      <ConfirmSheet
        open={confirmDelete}
        title="Delete recipe?"
        message={`“${capitalize(recipe.name)}” will be removed. Meals already planned with it will show it as deleted.`}
        confirmLabel="Delete"
        onConfirm={() => {
          deleteRecipe(recipe.id);
          void navigate("/recipes", { replace: true });
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

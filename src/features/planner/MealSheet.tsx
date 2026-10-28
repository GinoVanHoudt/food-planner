import { Check, ChefHat, RotateCcw, Utensils, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { formatDay, type DayKey } from "../../lib/dates";
import { cx } from "../../lib/cx";
import { capitalize } from "../../lib/units";
import { Button, IconButton } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Input } from "../../ui/Field";
import { Sheet } from "../../ui/Sheet";
import { Stepper } from "../../ui/Stepper";
import { useInventory } from "../inventory/inventory";
import { cookMeal } from "../inventory/stock";
import { RecipeFilterBar } from "../recipes/RecipeFilterBar";
import { useRecipes, type Recipe } from "../recipes/recipes";
import { useRecipeFilter } from "../recipes/useRecipeFilter";
import s from "./MealSheet.module.css";
import { saveSlot, usePlan } from "./plan";
import { EMPTY_SLOT, MEAL_LABELS, previousSlot, recipeNames, type Meal, type Slot } from "./types";

export interface MealTarget {
  day: DayKey;
  meal: Meal;
}

interface MealSheetProps {
  target: MealTarget | null;
  onClose: () => void;
}

/**
 * Edits one lunch/dinner slot. Changes are saved when the sheet closes, together with what marking
 * it cooked (or no longer cooked) changes in the inventory.
 */
export function MealSheet({ target, onClose }: MealSheetProps) {
  const { days } = usePlan();
  const { recipes, byId } = useRecipes();
  const { stock } = useInventory();
  const filter = useRecipeFilter(recipes);
  const [openedFor, setOpenedFor] = useState<MealTarget | null>(null);
  const [original, setOriginal] = useState<Slot>(EMPTY_SLOT);
  const [draft, setDraft] = useState<Slot>(EMPTY_SLOT);

  // Start a fresh draft whenever the sheet opens for a (new) slot.
  if (target && target !== openedFor) {
    const slot = days.get(target.day)?.[target.meal] ?? EMPTY_SLOT;
    setOpenedFor(target);
    setOriginal(slot);
    setDraft(slot);
    filter.setQuery("");
    filter.setTag(null);
  }

  const close = () => {
    // Every edit replaces the draft object, so an untouched draft is still the original.
    if (target && draft !== original) {
      const { slot, changes } = cookMeal(original, draft, byId, stock);
      saveSlot(target.day, target.meal, slot, changes);
    }
    onClose();
  };

  const isSelected = (recipeId: string) =>
    draft.recipes.some((planned) => planned.recipeId === recipeId);

  const removeRecipe = (recipeId: string) =>
    setDraft((current) => ({
      ...current,
      recipes: current.recipes.filter((planned) => planned.recipeId !== recipeId),
    }));

  const toggleRecipe = (recipe: Recipe) => {
    if (isSelected(recipe.id)) return removeRecipe(recipe.id);
    setDraft((current) => ({
      ...current,
      recipes: [...current.recipes, { recipeId: recipe.id, servings: recipe.servings }],
    }));
  };

  const setServings = (recipeId: string, servings: number) =>
    setDraft((current) => ({
      ...current,
      recipes: current.recipes.map((planned) =>
        planned.recipeId === recipeId ? { ...planned, servings } : planned,
      ),
    }));

  const setNote = (note: string) => setDraft((current) => ({ ...current, note }));

  const toggleCooked = () => setDraft((current) => ({ ...current, cooked: !current.cooked }));

  const shown = target ?? openedFor;
  const leftoverNames = shown ? recipeNames(previousSlot(days, shown.day, shown.meal), byId) : [];
  const leftoversNote = leftoverNames.length
    ? `Leftovers: ${leftoverNames.join(" + ")}`
    : "Leftovers";

  return (
    <Sheet
      open={target !== null}
      onClose={close}
      title={shown ? `${formatDay(shown.day)} · ${MEAL_LABELS[shown.meal]}` : ""}
      footer={
        <>
          <Button
            variant="danger"
            onClick={() => setDraft(EMPTY_SLOT)}
            disabled={!draft.recipes.length && !draft.note}
          >
            Clear
          </Button>
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        </>
      }
    >
      <div className={s.content}>
        <AnimatePresence initial={false}>
          {draft.recipes.length > 0 && (
            <motion.ul
              className={s.selected}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AnimatePresence initial={false}>
                {draft.recipes.map(({ recipeId, servings }) => (
                  <motion.li
                    key={recipeId}
                    layout
                    className={s.selectedRow}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                  >
                    <span className={s.selectedName}>
                      {capitalize(byId.get(recipeId)?.name ?? "Deleted recipe")}
                    </span>
                    <Stepper
                      label="Servings"
                      value={servings}
                      onChange={(value) => setServings(recipeId, value)}
                      max={50}
                    />
                    <IconButton label="Remove" onClick={() => removeRecipe(recipeId)}>
                      <X />
                    </IconButton>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>

        {draft.recipes.length > 0 && (
          <div className={s.cooked}>
            <ChipRow>
              <Chip icon={<ChefHat />} selected={Boolean(draft.cooked)} onClick={toggleCooked}>
                Cooked
              </Chip>
            </ChipRow>
            <p className={s.hint}>
              {draft.cooked
                ? "Its ingredients are removed from the inventory."
                : "Mark it once it's cooked to remove its ingredients from the inventory."}
            </p>
          </div>
        )}

        <div className={s.note}>
          <Input
            value={draft.note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note, e.g. eating out"
            aria-label="Note"
          />
          <ChipRow>
            <Chip
              icon={<RotateCcw />}
              selected={draft.note === leftoversNote}
              onClick={() => setNote(leftoversNote)}
            >
              Leftovers
            </Chip>
            <Chip
              icon={<Utensils />}
              selected={draft.note === "Eating out"}
              onClick={() => setNote("Eating out")}
            >
              Eating out
            </Chip>
          </ChipRow>
        </div>

        <h3 className={s.heading}>Add a recipe</h3>
        {recipes.length === 0 ? (
          <p className={s.muted}>
            No recipes yet. <Link to="/recipes/new">Add your first recipe</Link>.
          </p>
        ) : (
          <>
            <RecipeFilterBar filter={filter} />
            <ul className={s.options}>
              {filter.filtered.map((recipe) => {
                const selected = isSelected(recipe.id);
                return (
                  <li key={recipe.id}>
                    <motion.button
                      type="button"
                      className={cx(s.option, selected && s.optionSelected)}
                      aria-pressed={selected}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleRecipe(recipe)}
                    >
                      <span className={s.check}>{selected && <Check />}</span>
                      <span className={s.optionName}>{capitalize(recipe.name)}</span>
                      {recipe.tags.length > 0 && (
                        <span className={s.optionTags}>{recipe.tags.join(" · ")}</span>
                      )}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
            {filter.filtered.length === 0 && <p className={s.muted}>No recipes match.</p>}
          </>
        )}
      </div>
    </Sheet>
  );
}

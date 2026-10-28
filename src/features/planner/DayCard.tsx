import { ChefHat, Plus, RotateCcw, Soup, StickyNote } from "lucide-react";
import { motion } from "motion/react";
import { formatDayShort, relativeDayName, type DayKey } from "../../lib/dates";
import { cx } from "../../lib/cx";
import { capitalize } from "../../lib/units";
import type { Recipe } from "../recipes/recipes";
import s from "./DayCard.module.css";
import { isEmptySlot, MEAL_LABELS, MEALS, type DayPlan, type Meal, type Slot } from "./types";

interface DayCardProps {
  day: DayKey;
  today: DayKey;
  plan: DayPlan | undefined;
  recipes: Map<string, Recipe>;
  index: number;
  onEdit: (meal: Meal) => void;
}

export function DayCard({ day, today, plan, recipes, index, onEdit }: DayCardProps) {
  const relative = relativeDayName(day, today);
  const date = formatDayShort(day);
  return (
    <motion.article
      layout
      className={cx(s.day, day === today && s.today, day < today && s.past)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 14) * 0.03 } }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <header className={s.header}>
        <h2 className={s.label}>{relative ?? date}</h2>
        {relative && <span className={s.date}>{date}</span>}
      </header>
      {MEALS.map((meal) => (
        <MealRow
          key={meal}
          meal={meal}
          slot={plan?.[meal]}
          recipes={recipes}
          onClick={() => onEdit(meal)}
        />
      ))}
    </motion.article>
  );
}

interface MealRowProps {
  meal: Meal;
  slot: Slot | undefined;
  recipes: Map<string, Recipe>;
  onClick: () => void;
}

function MealRow({ meal, slot, recipes, onClick }: MealRowProps) {
  const planned = slot?.recipes ?? [];
  const fromInventory = slot?.fromInventory ?? [];
  const note = slot?.note ?? "";
  const empty = isEmptySlot(slot);
  const cooked = Boolean(slot?.cooked);
  return (
    <motion.button
      type="button"
      className={s.meal}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      aria-label={`${MEAL_LABELS[meal]}: ${empty ? "nothing planned, add" : cooked ? "cooked, edit" : "edit"}`}
    >
      <span className={cx(s.mealLabel, s[meal])}>{MEAL_LABELS[meal]}</span>
      <span className={s.content}>
        {empty && (
          <span className={s.add}>
            <Plus aria-hidden /> Add
          </span>
        )}
        {planned.map(({ recipeId, servings }) => (
          <span key={recipeId} className={s.recipe}>
            <span className={s.recipeName}>
              {capitalize(recipes.get(recipeId)?.name ?? "Deleted recipe")}
            </span>
            <span className={s.servings}>×{servings}</span>
          </span>
        ))}
        {fromInventory.map((name) => (
          <span key={name} className={s.recipe}>
            <Soup className={s.inventoryIcon} role="img" aria-label="From the inventory" />
            <span className={s.recipeName}>{capitalize(name)}</span>
          </span>
        ))}
        {note && (
          <span className={s.note}>
            {note.toLowerCase().startsWith("leftovers") ? (
              <RotateCcw aria-hidden />
            ) : (
              <StickyNote aria-hidden />
            )}
            {note}
          </span>
        )}
        {cooked && (
          <span className={s.cooked}>
            <ChefHat aria-hidden /> Cooked
          </span>
        )}
      </span>
    </motion.button>
  );
}

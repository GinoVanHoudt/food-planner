import { useMemo, useState } from "react";
import { addDays, PAST_DAYS, PLAN_DAYS, todayKey } from "../../lib/dates";
import { plural } from "../../lib/plural";
import { Button } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Field, Input } from "../../ui/Field";
import { Sheet } from "../../ui/Sheet";
import { showToast } from "../../ui/toast";
import { useCatalog } from "../ingredients/catalog";
import { usePlan } from "../planner/plan";
import { useRecipes } from "../recipes/recipes";
import { buildList } from "./buildList";
import s from "./GenerateSheet.module.css";
import { replaceGeneratedItems, useShopping } from "./shopping";

const PRESETS = [
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: PLAN_DAYS },
];

interface GenerateSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/** Builds the shopping list from the meals planned in a chosen date range. */
export function GenerateSheet({ open, onClose, onCreated }: GenerateSheetProps) {
  const today = todayKey();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 6));
  const plan = usePlan();
  const recipes = useRecipes();
  const { sectionOf } = useCatalog();
  const shopping = useShopping();
  // The current list must be loaded, or its generated items would not be replaced.
  const loading = plan.loading || recipes.loading || shopping.loading;

  const result = useMemo(
    () => buildList({ days: plan.days, recipes: recipes.byId, from, to, sectionOf }),
    [plan.days, recipes.byId, from, to, sectionOf],
  );
  const replacesItems = shopping.items.some((item) => !item.manual);

  const create = () => {
    replaceGeneratedItems(shopping.items, result.items, { from, to });
    showToast(`Shopping list ready: ${plural(result.items.length, "item")}`);
    onClose();
    onCreated?.();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New shopping list"
      footer={
        <Button variant="primary" onClick={create} disabled={loading || result.items.length === 0}>
          Create list
        </Button>
      }
    >
      <div className={s.content}>
        <p>Which days are you shopping for?</p>
        <ChipRow>
          {PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              selected={from === today && to === addDays(today, preset.days - 1)}
              onClick={() => {
                setFrom(today);
                setTo(addDays(today, preset.days - 1));
              }}
            >
              {preset.label}
            </Chip>
          ))}
        </ChipRow>
        <div className={s.dates}>
          <Field label="From">
            <Input
              type="date"
              value={from}
              min={addDays(today, -PAST_DAYS)}
              max={to}
              onChange={(event) => event.target.value && setFrom(event.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={to}
              min={from}
              max={addDays(today, PLAN_DAYS - 1)}
              onChange={(event) => event.target.value && setTo(event.target.value)}
            />
          </Field>
        </div>
        <p className={s.summary}>
          {plural(result.mealCount, "planned meal")} · {plural(result.items.length, "item")}
        </p>
        {result.mealCount === 0 && (
          <p className={s.muted}>No meals with recipes are planned in these days.</p>
        )}
        {replacesItems && result.items.length > 0 && (
          <p className={s.muted}>This replaces the current list. Items you added by hand stay.</p>
        )}
      </div>
    </Sheet>
  );
}

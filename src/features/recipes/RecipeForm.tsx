import { ClipboardPaste, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type FormEvent } from "react";
import {
  cleanName,
  COMMON_UNITS,
  formatQuantity,
  MAX_NAME_LENGTH,
  type Ingredient,
} from "../../lib/units";
import { Button, IconButton } from "../../ui/Button";
import { Field, Input, Textarea } from "../../ui/Field";
import { Card } from "../../ui/Page";
import { Sheet } from "../../ui/Sheet";
import { Stepper } from "../../ui/Stepper";
import { normalizeUrl, parseIngredientList, toIngredients, type IngredientRow } from "./input";
import { DEFAULT_SERVINGS, type Recipe, type RecipeInput } from "./recipes";
import s from "./RecipeForm.module.css";
import { TagInput } from "./TagInput";

interface Row extends IngredientRow {
  key: string;
}

const toRow = (ingredient: Ingredient): Row => ({
  key: crypto.randomUUID(),
  quantity: ingredient.quantity === null ? "" : formatQuantity(ingredient.quantity),
  unit: ingredient.unit,
  name: ingredient.name,
});

const emptyRow = () => toRow({ name: "", quantity: null, unit: "" });

interface RecipeFormProps {
  id: string;
  initial?: Recipe;
  ingredientNames: string[];
  tagSuggestions: string[];
  onSubmit: (input: RecipeInput) => void;
}

export function RecipeForm({
  id,
  initial,
  ingredientNames,
  tagSuggestions,
  onSubmit,
}: RecipeFormProps) {
  const listId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [servings, setServings] = useState(initial?.servings ?? DEFAULT_SERVINGS);
  const [tags, setTags] = useState(initial?.tags ?? []);
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.ingredients.length ? initial.ingredients.map(toRow) : [emptyRow()],
  );
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addRow = () => {
    const row = emptyRow();
    setRows((current) => [...current, row]);
    setFocusKey(row.key);
  };

  const addPasted = () => {
    const parsed = parseIngredientList(pasteText).map(toRow);
    setRows((current) => [...current.filter((row) => row.name.trim()), ...parsed]);
    setPasteText("");
    setPasteOpen(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: cleanName(name),
      servings,
      tags,
      sourceUrl: normalizeUrl(sourceUrl),
      instructions: instructions.trim(),
      ingredients: toIngredients(rows),
    });
  };

  return (
    <form id={id} className={s.form} onSubmit={submit}>
      <Card>
        <Field label="Name">
          <Input
            required
            pattern=".*\S.*"
            title="Enter a name"
            maxLength={MAX_NAME_LENGTH}
            autoCapitalize="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. chili sin carne"
            autoFocus={!initial}
          />
        </Field>
        <div className={s.servings}>
          <span>
            <strong>Serves</strong>
            <span className={s.hint}>Ingredient amounts below are for this many servings.</span>
          </span>
          <Stepper label="Servings" value={servings} onChange={setServings} max={50} />
        </div>
        <Field label="Tags">
          <TagInput tags={tags} onChange={setTags} suggestions={tagSuggestions} />
        </Field>
        <Field label="Source link">
          <Input
            type="url"
            inputMode="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://…"
          />
        </Field>
      </Card>

      <Card
        title="Ingredients"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<ClipboardPaste />}
            onClick={() => setPasteOpen(true)}
          >
            Paste list
          </Button>
        }
      >
        <ul className={s.rows}>
          <AnimatePresence initial={false}>
            {rows.map((row, index) => (
              <motion.li
                key={row.key}
                className={s.row}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Input
                  className={s.quantity}
                  inputMode="decimal"
                  aria-label={`Quantity ${index + 1}`}
                  placeholder="Qty"
                  value={row.quantity}
                  autoFocus={row.key === focusKey}
                  onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                />
                <Input
                  className={s.unit}
                  list={`${listId}-units`}
                  aria-label={`Unit ${index + 1}`}
                  placeholder="Unit"
                  autoCapitalize="off"
                  value={row.unit}
                  onChange={(event) => updateRow(row.key, { unit: event.target.value })}
                />
                <Input
                  list={`${listId}-names`}
                  maxLength={MAX_NAME_LENGTH}
                  aria-label={`Ingredient ${index + 1}`}
                  placeholder="Ingredient"
                  autoCapitalize="off"
                  enterKeyHint="next"
                  value={row.name}
                  onChange={(event) => updateRow(row.key, { name: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (index === rows.length - 1) addRow();
                    }
                  }}
                />
                <IconButton
                  label={`Remove ingredient ${index + 1}`}
                  onClick={() =>
                    setRows((current) => current.filter((other) => other.key !== row.key))
                  }
                >
                  <X />
                </IconButton>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <Button variant="ghost" icon={<Plus />} onClick={addRow}>
          Add ingredient
        </Button>
        <datalist id={`${listId}-units`}>
          {COMMON_UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
        <datalist id={`${listId}-names`}>
          {ingredientNames.map((ingredient) => (
            <option key={ingredient} value={ingredient} />
          ))}
        </datalist>
      </Card>

      <Card title="Instructions">
        <Textarea
          aria-label="Instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Steps, tips, oven temperature…"
        />
      </Card>

      <Button type="submit" variant="primary" block>
        Save recipe
      </Button>

      <Sheet
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste ingredients"
        footer={
          <Button variant="primary" onClick={addPasted} disabled={!pasteText.trim()}>
            Add ingredients
          </Button>
        }
      >
        <Field
          label="One ingredient per line"
          hint="e.g. “200 g onions”, “2 cloves garlic”, “salt”"
        >
          <Textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={"400 g minced beef\n1 can tomatoes\n2 onions"}
            autoFocus
          />
        </Field>
      </Sheet>
    </form>
  );
}

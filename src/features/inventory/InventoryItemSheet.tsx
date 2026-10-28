import { House, Soup, Trash, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { capitalize, formatAmounts, parseAmounts } from "../../lib/units";
import { Button, IconButton } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Field, Input } from "../../ui/Field";
import { Sheet } from "../../ui/Sheet";
import { setIngredientLocations, setIngredientMeal, useCatalog } from "../ingredients/catalog";
import { useLocations } from "../settings/locations";
import { saveStock, type InventoryItem } from "./inventory";
import s from "./InventoryItemSheet.module.css";
import { editedItem } from "./stock";

/** The item to edit. Pass a new object each time the sheet opens. */
export interface InventoryTarget {
  item: InventoryItem;
}

interface Draft {
  amount: string;
  /** `YYYY-MM-DD`, or empty for no date. */
  expires: string;
  locationId: string;
  meal: boolean;
  always: boolean;
}

/**
 * Edits the amount, expiry date, location and "full meal" and "always at home" flags of something
 * at home.
 */
export function InventoryItemSheet({
  target,
  onClose,
}: {
  target: InventoryTarget | null;
  onClose: () => void;
}) {
  const formId = useId();
  const locations = useLocations();
  const { locationOf, isMeal } = useCatalog();
  const [openedFor, setOpenedFor] = useState<InventoryTarget | null>(null);
  const [draft, setDraft] = useState<Draft>({
    amount: "",
    expires: "",
    locationId: "",
    meal: false,
    always: false,
  });

  // Start a fresh draft whenever the sheet opens.
  if (target && target !== openedFor) {
    setOpenedFor(target);
    setDraft({
      amount: formatAmounts(target.item.amounts),
      expires: target.item.expires ?? "",
      locationId: locationOf(target.item.name),
      meal: isMeal(target.item.name),
      always: target.item.always,
    });
  }

  const item = (target ?? openedFor)?.item ?? null;
  const amounts = parseAmounts(draft.amount);
  const invalid = !draft.always && amounts === null;

  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!item || invalid) return;
    const edited = editedItem({
      name: item.name,
      amounts: amounts ?? [],
      always: draft.always,
      expires: draft.expires,
    });
    saveStock(new Map([[item.id, edited]]));
    if (draft.locationId !== locationOf(item.name)) {
      setIngredientLocations([{ name: item.name, locationId: draft.locationId }]);
    }
    if (draft.meal !== isMeal(item.name)) setIngredientMeal(item.name, draft.meal);
    onClose();
  };

  const remove = () => {
    if (item) saveStock(new Map([[item.id, null]]));
    onClose();
  };

  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      title={capitalize(item?.name ?? "")}
      footer={
        <>
          <Button variant="danger" icon={<Trash />} onClick={remove}>
            Remove from inventory
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={invalid}>
            Save
          </Button>
        </>
      }
    >
      <form id={formId} className={s.form} onSubmit={save}>
        {!draft.always && (
          <>
            <Field
              label="Amount"
              hint="e.g. 500 g, 6 or 1 kg + 2 pcs. Leave it empty if you just have some."
            >
              <Input
                value={draft.amount}
                onChange={(event) => update({ amount: event.target.value })}
                placeholder="some"
                aria-invalid={invalid}
                autoComplete="off"
              />
            </Field>
            {invalid && <p className={s.error}>That is not an amount.</p>}
            <Field label="Expires">
              <span className={s.date}>
                <Input
                  type="date"
                  value={draft.expires}
                  onChange={(event) => update({ expires: event.target.value })}
                />
                {draft.expires && (
                  <IconButton label="No expiry date" onClick={() => update({ expires: "" })}>
                    <X />
                  </IconButton>
                )}
              </span>
            </Field>
            <div className={s.group}>
              <h3 className={s.heading}>Kept in</h3>
              <ChipRow>
                {locations.map((location) => (
                  <Chip
                    key={location.id}
                    selected={location.id === draft.locationId}
                    onClick={() => update({ locationId: location.id })}
                  >
                    {location.name}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <div className={s.group}>
              <ChipRow>
                <Chip
                  icon={<Soup />}
                  selected={draft.meal}
                  onClick={() => update({ meal: !draft.meal })}
                >
                  Full meal
                </Chip>
              </ChipRow>
              <p className={s.hint}>
                For things like a frozen soup or leftovers: plan it as a lunch or dinner, and it
                leaves the inventory once it's eaten.
              </p>
            </div>
          </>
        )}
        <div className={s.group}>
          <ChipRow>
            <Chip
              icon={<House />}
              selected={draft.always}
              onClick={() => update({ always: !draft.always, meal: false })}
            >
              Always at home
            </Chip>
          </ChipRow>
          <p className={s.hint}>
            For things like salt or olive oil: never put on the shopping list and never used up.
          </p>
        </div>
      </form>
    </Sheet>
  );
}

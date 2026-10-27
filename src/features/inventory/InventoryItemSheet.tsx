import { House, Trash } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { formatAmounts, parseAmounts } from "../../lib/units";
import { Button } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Field, Input } from "../../ui/Field";
import { Sheet } from "../../ui/Sheet";
import { setIngredientLocations, useCatalog } from "../ingredients/catalog";
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
  locationId: string;
  always: boolean;
}

/** Edits the amount, location and "always at home" flag of something at home. */
export function InventoryItemSheet({
  target,
  onClose,
}: {
  target: InventoryTarget | null;
  onClose: () => void;
}) {
  const formId = useId();
  const locations = useLocations();
  const { locationOf } = useCatalog();
  const [openedFor, setOpenedFor] = useState<InventoryTarget | null>(null);
  const [draft, setDraft] = useState<Draft>({ amount: "", locationId: "", always: false });

  // Start a fresh draft whenever the sheet opens.
  if (target && target !== openedFor) {
    setOpenedFor(target);
    setDraft({
      amount: formatAmounts(target.item.amounts),
      locationId: locationOf(target.item.name),
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
    saveStock(new Map([[item.id, editedItem(item.name, amounts ?? [], draft.always)]]));
    if (draft.locationId !== locationOf(item.name)) {
      setIngredientLocations([{ name: item.name, locationId: draft.locationId }]);
    }
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
      title={item?.name ?? ""}
      footer={
        <>
          <Button variant="danger" icon={<Trash />} onClick={remove}>
            Remove
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
          </>
        )}
        <div className={s.group}>
          <ChipRow>
            <Chip
              icon={<House />}
              selected={draft.always}
              onClick={() => update({ always: !draft.always })}
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

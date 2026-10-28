import { Check, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { cx } from "../../lib/cx";
import { plural } from "../../lib/plural";
import { formatAmounts, MAX_NAME_LENGTH, parseIngredientLine, type Amount } from "../../lib/units";
import { Button, IconButton } from "../../ui/Button";
import { Input, Select } from "../../ui/Field";
import { Sheet } from "../../ui/Sheet";
import { showToast } from "../../ui/toast";
import { setIngredientLocations, useCatalog } from "../ingredients/catalog";
import { useInventory } from "../inventory/inventory";
import { addToStock } from "../inventory/stock";
import { useLocations } from "../settings/locations";
import s from "./PutAwaySheet.module.css";
import { putAwayItems, type ShoppingItem } from "./shopping";

interface Row {
  id: string;
  name: string;
  amounts: Amount[];
  locationId: string;
  /** Goes into the inventory; unselected rows (e.g. toilet paper) only leave the list. */
  selected: boolean;
}

interface PutAwaySheetProps {
  /** The items in the cart when the sheet opened. Pass a new array each time it opens. */
  items: ShoppingItem[] | null;
  onClose: () => void;
}

/** Takes the cart off the list and puts the bought things, plus any extras, in the inventory. */
export function PutAwaySheet({ items, onClose }: PutAwaySheetProps) {
  const { stock } = useInventory();
  const { locationOf } = useCatalog();
  const locations = useLocations();
  const [openedFor, setOpenedFor] = useState<ShoppingItem[] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [extra, setExtra] = useState("");

  const toRow = (id: string, name: string, amounts: Amount[]): Row => ({
    id,
    name,
    amounts,
    locationId: locationOf(name),
    selected: true,
  });

  // Start fresh whenever the sheet opens.
  if (items && items !== openedFor) {
    setOpenedFor(items);
    setRows(items.map((item) => toRow(item.id, item.name, item.amounts)));
    setExtra("");
  }

  const cart = items ?? openedFor ?? [];
  const chosen = rows.filter((row) => row.selected);

  const update = (id: string, changes: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));

  const addExtra = (event: FormEvent) => {
    event.preventDefault();
    const { name, quantity, unit } = parseIngredientLine(extra);
    if (!name) return;
    const amounts = quantity === null ? [] : [{ quantity, unit }];
    setRows((current) => [...current, toRow(crypto.randomUUID(), name, amounts)]);
    setExtra("");
  };

  const done = () => {
    putAwayItems(cart, addToStock(stock, chosen));
    setIngredientLocations(
      chosen
        .filter((row) => row.locationId !== locationOf(row.name))
        .map(({ name, locationId }) => ({ name, locationId })),
    );
    showToast(`Added ${plural(chosen.length, "item")} to inventory`);
    onClose();
  };

  return (
    <Sheet
      open={items !== null}
      onClose={onClose}
      title="Add to inventory"
      footer={
        <Button variant="primary" onClick={done}>
          {chosen.length > 0
            ? `Add ${plural(chosen.length, "item")} to inventory`
            : "Clear the cart"}
        </Button>
      }
    >
      <div className={s.content}>
        <p className={s.muted}>
          Everything in the cart leaves the list. The ticked items go into the inventory.
        </p>
        <ul className={s.rows}>
          {rows.map((row) => (
            <li key={row.id} className={s.row}>
              <motion.button
                type="button"
                role="checkbox"
                aria-checked={row.selected}
                className={cx(s.toggle, row.selected && s.selected)}
                whileTap={{ scale: 0.98 }}
                onClick={() => update(row.id, { selected: !row.selected })}
              >
                <span className={s.check}>{row.selected && <Check />}</span>
                <span className={s.text}>
                  <span className={s.name}>{row.name}</span>
                  {row.amounts.length > 0 && (
                    <span className={s.amount}>{formatAmounts(row.amounts)}</span>
                  )}
                </span>
              </motion.button>
              <Select
                className={s.location}
                value={row.locationId}
                onChange={(event) => update(row.id, { locationId: event.target.value })}
                disabled={!row.selected}
                aria-label={`Where ${row.name} goes`}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
        <form className={s.addForm} onSubmit={addExtra}>
          <Input
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            placeholder="Bought something else? e.g. 6 eggs"
            maxLength={MAX_NAME_LENGTH}
            aria-label="Add something else you bought"
            enterKeyHint="done"
          />
          <IconButton type="submit" label="Add" disabled={!extra.trim()}>
            <Plus />
          </IconButton>
        </form>
      </div>
    </Sheet>
  );
}

import { Plus, Refrigerator } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState, type FormEvent } from "react";
import { groupInOrder } from "../../lib/group";
import { capitalize, formatAmounts, MAX_NAME_LENGTH, parseIngredientLine } from "../../lib/units";
import { IconButton } from "../../ui/Button";
import { EmptyState } from "../../ui/EmptyState";
import { Input } from "../../ui/Field";
import { ListGroup } from "../../ui/ListGroup";
import { Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { useCatalog } from "../ingredients/catalog";
import { OTHER_LOCATION_ID, useLocations } from "../settings/locations";
import { saveStock, useInventory } from "./inventory";
import { InventoryItemSheet, type InventoryTarget } from "./InventoryItemSheet";
import s from "./InventoryPage.module.css";
import { addToStock } from "./stock";

/** Shown after the locations; its id never clashes with theirs (random hex). */
const ALWAYS_GROUP = { id: "always", name: "Always at home" };

export function InventoryPage() {
  const { items, stock, loading } = useInventory();
  const locations = useLocations();
  const { locationOf } = useCatalog();
  const [target, setTarget] = useState<InventoryTarget | null>(null);
  const [newItem, setNewItem] = useState("");

  const groups = [
    ...groupInOrder(
      items.filter((item) => !item.always),
      locations,
      (item) => locationOf(item.name),
      OTHER_LOCATION_ID,
    ),
    { group: ALWAYS_GROUP, items: items.filter((item) => item.always) },
  ].filter((entry) => entry.items.length > 0);

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    const { name, quantity, unit } = parseIngredientLine(newItem);
    if (!name) return;
    saveStock(
      addToStock(stock, [{ name, amounts: quantity === null ? [] : [{ quantity, unit }] }]),
    );
    setNewItem("");
  };

  return (
    <>
      <PageHeader title="Inventory" />
      <Page>
        <form className={s.addForm} onSubmit={addItem}>
          <Input
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            placeholder="Add what you have, e.g. 500 g rice"
            maxLength={MAX_NAME_LENGTH}
            aria-label="Add to inventory"
            autoCapitalize="off"
            enterKeyHint="done"
          />
          <IconButton
            type="submit"
            label="Add to inventory"
            className={s.addButton}
            disabled={!newItem.trim()}
          >
            <Plus />
          </IconButton>
        </form>

        {loading ? null : items.length === 0 ? (
          <EmptyState
            icon={<Refrigerator />}
            title="Nothing at home yet"
            text="Add what you have in the fridge, freezer and cupboards, or add your shopping from the cart to the inventory."
          />
        ) : (
          <AnimatePresence initial={false}>
            {groups.map(({ group, items: groupItems }) => (
              <ListGroup key={group.id} title={group.name} count={groupItems.length}>
                {groupItems.map((item) => (
                  <li key={item.id}>
                    <button type="button" className={s.item} onClick={() => setTarget({ item })}>
                      <span className={s.name}>{capitalize(item.name)}</span>
                      {!item.always && (
                        <span className={s.amount}>
                          {item.amounts.length > 0 ? formatAmounts(item.amounts) : "some"}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ListGroup>
            ))}
          </AnimatePresence>
        )}
      </Page>

      <InventoryItemSheet target={target} onClose={() => setTarget(null)} />
    </>
  );
}

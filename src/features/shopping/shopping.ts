import { collection, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { DayKey } from "../../lib/dates";
import { db } from "../../lib/firebase";
import { liveCollection, liveDocument, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
import { addAmounts, type Ingredient } from "../../lib/units";
import { setIngredientSection } from "../ingredients/catalog";
import type { GeneratedItem } from "./buildList";

export interface ShoppingItem extends GeneratedItem {
  id: string;
  checked: boolean;
  /** Added by hand rather than generated from the plan; kept when the list is regenerated. */
  manual: boolean;
}

/** The planned days the current list was generated for. */
export interface ShoppingRange {
  from: DayKey;
  to: DayKey;
}

const itemsRef = () => collection(db, "shoppingItems");
const rangeRef = () => doc(db, "settings", "shopping");
const itemsStore = liveCollection<ShoppingItem>(itemsRef);
const rangeStore = liveDocument<ShoppingRange>(rangeRef);

export function useShopping() {
  const items = useLive(itemsStore);
  const range = useLive(rangeStore);
  return { items: items.data, range: range.data, loading: items.loading };
}

/** Replaces all generated items with a new list. Manual items stay. */
export function replaceGeneratedItems(
  current: ShoppingItem[],
  generated: GeneratedItem[],
  range: ShoppingRange,
) {
  const batch = writeBatch(db);
  for (const item of current) {
    if (!item.manual) batch.delete(doc(itemsRef(), item.id));
  }
  for (const item of generated) {
    batch.set(doc(itemsRef()), { ...item, checked: false, manual: false });
  }
  batch.set(rangeRef(), range);
  persist(batch.commit(), "Creating the list");
}

export function addManualItem({ name, quantity, unit }: Ingredient, sectionId: string) {
  const amounts = quantity === null ? [] : addAmounts([{ quantity, unit }]);
  persist(
    setDoc(doc(itemsRef()), {
      name,
      amounts,
      sectionId,
      sources: [],
      checked: false,
      manual: true,
    }),
    "Adding item",
  );
}

export function setChecked(itemId: string, checked: boolean) {
  persist(updateDoc(doc(itemsRef(), itemId), { checked }), "Updating item");
}

/** Moves the item and remembers the section for this ingredient in future lists. */
export function moveToSection(item: ShoppingItem, sectionId: string) {
  persist(updateDoc(doc(itemsRef(), item.id), { sectionId }), "Moving item");
  setIngredientSection(item.name, sectionId);
}

export function deleteItems(items: ShoppingItem[]) {
  const batch = writeBatch(db);
  for (const item of items) batch.delete(doc(itemsRef(), item.id));
  persist(batch.commit(), "Removing items");
}

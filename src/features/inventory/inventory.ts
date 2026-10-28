import { collection, doc, setDoc, writeBatch, type WriteBatch } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
import { liveCollection, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
import { byName } from "../../lib/sort";
import { cleanName, ingredientKey } from "../../lib/units";
import type { Stock, StockChanges, StockItem } from "./stock";

/** Something at home, stored under its `ingredientKey`. */
export interface InventoryItem extends StockItem {
  id: string;
}

const inventoryRef = () => collection(db, "inventory");
const inventoryStore = liveCollection<InventoryItem>(inventoryRef);

export function useInventory() {
  const { data, loading } = useLive(inventoryStore);
  return useMemo(() => {
    const stock: Stock = new Map(data.map((item) => [item.id, item]));
    return { items: [...data].sort(byName), stock, loading };
  }, [data, loading]);
}

/** Adds the inventory changes to a batch, so they are saved together with other changes. */
export function addStockChanges(batch: WriteBatch, changes: StockChanges) {
  for (const [key, item] of changes) {
    const ref = doc(inventoryRef(), key);
    if (item) {
      batch.set(ref, { name: cleanName(item.name), amounts: item.amounts, always: item.always });
    } else {
      batch.delete(ref);
    }
  }
}

export function saveStock(changes: StockChanges) {
  if (changes.size === 0) return;
  const batch = writeBatch(db);
  addStockChanges(batch, changes);
  persist(batch.commit(), "Saving inventory");
}

/** Remembers that an ingredient is always at home, so it is never put on the list again. */
export function setAlwaysAtHome(name: string) {
  persist(
    setDoc(doc(inventoryRef(), ingredientKey(name)), {
      name: cleanName(name),
      amounts: [],
      always: true,
    }),
    "Saving inventory",
  );
}

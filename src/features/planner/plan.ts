import {
  collection,
  deleteField,
  doc,
  documentId,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { useMemo } from "react";
import { addDays, PAST_DAYS, todayKey, type DayKey } from "../../lib/dates";
import { db } from "../../lib/firebase";
import { liveCollection, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
import { addStockChanges } from "../inventory/inventory";
import type { StockChanges } from "../inventory/stock";
import { isEmptySlot, type DayPlan, type Meal, type Slot } from "./types";

const planStore = liveCollection<DayPlan>(() =>
  query(collection(db, "plan"), where(documentId(), ">=", addDays(todayKey(), -PAST_DAYS))),
);

export function usePlan() {
  const { data, loading } = useLive(planStore);
  return useMemo(
    () => ({ days: new Map(data.map((day) => [day.id, day])), loading }),
    [data, loading],
  );
}

/** Saves a meal, together with what cooking it (or no longer) changes in the inventory. */
export function saveSlot(day: DayKey, meal: Meal, slot: Slot, stock: StockChanges = new Map()) {
  const value = isEmptySlot(slot) ? deleteField() : { ...slot, note: slot.note.trim() };
  const batch = writeBatch(db);
  // Replace the whole meal, so fields it no longer has (like `cooked`) are removed.
  batch.set(doc(db, "plan", day), { [meal]: value }, { mergeFields: [meal] });
  addStockChanges(batch, stock);
  persist(batch.commit(), "Saving meal");
}

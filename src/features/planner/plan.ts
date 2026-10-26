import { collection, deleteField, doc, documentId, query, setDoc, where } from "firebase/firestore";
import { useMemo } from "react";
import { addDays, PAST_DAYS, todayKey, type DayKey } from "../../lib/dates";
import { db } from "../../lib/firebase";
import { liveCollection, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
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

export function saveSlot(day: DayKey, meal: Meal, slot: Slot) {
  const value = isEmptySlot(slot) ? deleteField() : { ...slot, note: slot.note.trim() };
  persist(setDoc(doc(db, "plan", day), { [meal]: value }, { merge: true }), "Saving meal");
}

import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
import { liveCollection, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
import { cleanName, ingredientKey } from "../../lib/units";
import { OTHER_LOCATION_ID } from "../settings/locations";
import { OTHER_SECTION_ID } from "../settings/sections";
import { catalogLookup, unknownIngredients } from "./lookup";

/**
 * Every ingredient name used so far, with the store section it was last put in, the place at home
 * where it is kept and whether it is a full meal.
 */
export interface CatalogEntry {
  id: string;
  name: string;
  sectionId?: string;
  locationId?: string;
  /** A full meal, like a frozen soup or leftovers, that can be planned as lunch or dinner. */
  meal?: boolean;
}

const catalogRef = () => collection(db, "ingredients");
const catalogStore = liveCollection<CatalogEntry>(catalogRef);

export function useCatalog() {
  const { data, loading } = useLive(catalogStore);
  return useMemo(
    () => ({
      entries: data,
      ...catalogLookup(data, { sectionId: OTHER_SECTION_ID, locationId: OTHER_LOCATION_ID }),
      loading,
    }),
    [data, loading],
  );
}

/** Adds names that are not in the catalog yet (in section "Other"). */
export function rememberIngredients(names: string[], isKnown: (name: string) => boolean) {
  const unknown = unknownIngredients(names, isKnown);
  if (unknown.size === 0) return;
  const batch = writeBatch(db);
  for (const [key, name] of unknown) {
    batch.set(doc(catalogRef(), key), { name, sectionId: OTHER_SECTION_ID }, { merge: true });
  }
  persist(batch.commit(), "Saving ingredients");
}

export function setIngredientSection(name: string, sectionId: string) {
  persist(
    setDoc(
      doc(catalogRef(), ingredientKey(name)),
      { name: cleanName(name), sectionId },
      { merge: true },
    ),
    "Saving section",
  );
}

/** Remembers where at home each ingredient is kept. */
export function setIngredientLocations(entries: { name: string; locationId: string }[]) {
  if (entries.length === 0) return;
  const batch = writeBatch(db);
  for (const { name, locationId } of entries) {
    batch.set(
      doc(catalogRef(), ingredientKey(name)),
      { name: cleanName(name), locationId },
      { merge: true },
    );
  }
  persist(batch.commit(), "Saving location");
}

/** Remembers whether an ingredient is a full meal, so it stays one when it is bought again. */
export function setIngredientMeal(name: string, meal: boolean) {
  persist(
    setDoc(
      doc(catalogRef(), ingredientKey(name)),
      { name: cleanName(name), meal },
      { merge: true },
    ),
    "Saving meal",
  );
}

import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
import { liveCollection, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
import { compareNames } from "../../lib/sort";
import { ingredientKey } from "../../lib/units";
import { OTHER_LOCATION_ID } from "../settings/locations";
import { OTHER_SECTION_ID } from "../settings/sections";

/**
 * Every ingredient name used so far, with the store section it was last put in and the place at
 * home where it is kept.
 */
export interface CatalogEntry {
  id: string;
  name: string;
  sectionId?: string;
  locationId?: string;
}

const catalogRef = () => collection(db, "ingredients");
const catalogStore = liveCollection<CatalogEntry>(catalogRef);

export function useCatalog() {
  const { data, loading } = useLive(catalogStore);
  return useMemo(() => {
    const byKey = new Map(data.map((entry) => [entry.id, entry]));
    const names = data.map((entry) => entry.name).sort(compareNames);
    const sectionOf = (name: string) =>
      byKey.get(ingredientKey(name))?.sectionId ?? OTHER_SECTION_ID;
    const locationOf = (name: string) =>
      byKey.get(ingredientKey(name))?.locationId ?? OTHER_LOCATION_ID;
    return {
      entries: data,
      names,
      sectionOf,
      locationOf,
      has: (name: string) => byKey.has(ingredientKey(name)),
      loading,
    };
  }, [data, loading]);
}

/** Adds names that are not in the catalog yet (in section "Other"). */
export function rememberIngredients(names: string[], isKnown: (name: string) => boolean) {
  const unknown = new Map(
    names
      .filter((name) => name.trim() && !isKnown(name))
      .map((name) => [ingredientKey(name), name.trim()]),
  );
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
      { name: name.trim(), sectionId },
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
      { name: name.trim(), locationId },
      { merge: true },
    );
  }
  persist(batch.commit(), "Saving location");
}

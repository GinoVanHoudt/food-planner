import { doc, setDoc } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
import { withFallback } from "../../lib/group";
import { liveDocument, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";

/** A place at home where food is kept, like the fridge or the freezer. */
export interface StorageLocation {
  id: string;
  name: string;
}

/** The catch-all location. It always exists and cannot be deleted. */
export const OTHER_LOCATION_ID = "other";

const OTHER_LOCATION: StorageLocation = { id: OTHER_LOCATION_ID, name: "Other" };

const DEFAULT_LOCATIONS: StorageLocation[] = [
  { id: "fridge", name: "Fridge" },
  { id: "freezer", name: "Freezer" },
  { id: "pantry", name: "Pantry" },
  { id: "cans", name: "Cans & jars" },
  OTHER_LOCATION,
];

const locationsRef = () => doc(db, "settings", "locations");
const locationsStore = liveDocument<{ locations: StorageLocation[] }>(locationsRef);

/** Inventory locations in their chosen order. Falls back to defaults until they are first edited. */
export function useLocations(): StorageLocation[] {
  const { data } = useLive(locationsStore);
  return useMemo(() => withFallback(data?.locations ?? DEFAULT_LOCATIONS, OTHER_LOCATION), [data]);
}

export function saveLocations(locations: StorageLocation[]) {
  persist(
    setDoc(locationsRef(), { locations: withFallback(locations, OTHER_LOCATION) }),
    "Saving locations",
  );
}

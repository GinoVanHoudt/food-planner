import { doc, setDoc } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
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

function withOther(locations: StorageLocation[]): StorageLocation[] {
  return locations.some((location) => location.id === OTHER_LOCATION_ID)
    ? locations
    : [...locations, OTHER_LOCATION];
}

/** Inventory locations in their chosen order. Falls back to defaults until they are first edited. */
export function useLocations(): StorageLocation[] {
  const { data } = useLive(locationsStore);
  return useMemo(() => withOther(data?.locations ?? DEFAULT_LOCATIONS), [data]);
}

export function saveLocations(locations: StorageLocation[]) {
  persist(setDoc(locationsRef(), { locations: withOther(locations) }), "Saving locations");
}

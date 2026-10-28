import { doc, setDoc } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
import { withFallback } from "../../lib/group";
import { liveDocument, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";

export interface Section {
  id: string;
  name: string;
}

/** The catch-all section. It always exists and cannot be deleted. */
export const OTHER_SECTION_ID = "other";

const OTHER_SECTION: Section = { id: OTHER_SECTION_ID, name: "Other" };

const DEFAULT_SECTIONS: Section[] = [
  { id: "produce", name: "Fruit & veg" },
  { id: "bakery", name: "Bread & bakery" },
  { id: "meat", name: "Meat & fish" },
  { id: "dairy", name: "Dairy & eggs" },
  { id: "pantry", name: "Pantry" },
  { id: "frozen", name: "Frozen" },
  { id: "drinks", name: "Drinks" },
  { id: "household", name: "Household" },
  OTHER_SECTION,
];

const sectionsRef = () => doc(db, "settings", "sections");
const sectionsStore = liveDocument<{ sections: Section[] }>(sectionsRef);

/** Store sections in walking order. Falls back to defaults until they are first edited. */
export function useSections(): Section[] {
  const { data } = useLive(sectionsStore);
  return useMemo(() => withFallback(data?.sections ?? DEFAULT_SECTIONS, OTHER_SECTION), [data]);
}

export function saveSections(sections: Section[]) {
  persist(
    setDoc(sectionsRef(), { sections: withFallback(sections, OTHER_SECTION) }),
    "Saving sections",
  );
}

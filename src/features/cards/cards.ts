import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../../lib/firebase";
import { liveCollection, useLive } from "../../lib/live";
import { persist } from "../../lib/persist";
import { byName } from "../../lib/sort";
import type { CardFormat } from "./barcode";

/** A store loyalty card, shown as a scannable code at the register. */
export interface LoyaltyCard {
  id: string;
  name: string;
  format: CardFormat;
  /** The QR code contents, or the barcode digits. */
  value: string;
}

export type LoyaltyCardInput = Omit<LoyaltyCard, "id">;

export const MAX_CARD_NAME_LENGTH = 100;
export const MAX_CARD_VALUE_LENGTH = 1000;

const cardsStore = liveCollection<LoyaltyCard>(() => collection(db, "cards"));

export function useCards() {
  const { data, loading } = useLive(cardsStore);
  const cards = useMemo(() => [...data].sort(byName), [data]);
  return { cards, loading };
}

export function saveCard(id: string | undefined, input: LoyaltyCardInput) {
  const ref = id ? doc(db, "cards", id) : doc(collection(db, "cards"));
  persist(setDoc(ref, input), "Saving card");
}

export function deleteCard(id: string) {
  persist(deleteDoc(doc(db, "cards", id)), "Deleting card");
}

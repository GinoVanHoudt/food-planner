import { Barcode, Pencil, Plus, QrCode } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "../../ui/Button";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { Sheet } from "../../ui/Sheet";
import { deleteCard, useCards, type LoyaltyCard } from "./cards";
import { CardSheet, type CardTarget } from "./CardSheet";
import s from "./CardsSheet.module.css";
import { CodeOverlay } from "./CodeOverlay";

interface CardsSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The store loyalty cards; tap one to show its code full size at the register. The sheet closes
 * before the code or the card editor opens, so modals never stack.
 */
export function CardsSheet({ open, onClose }: CardsSheetProps) {
  const { cards, loading } = useCards();
  const [target, setTarget] = useState<CardTarget | null>(null);
  const [shown, setShown] = useState<LoyaltyCard | null>(null);
  // Kept after the confirmation closes so its text stays put while it animates out.
  const [deleting, setDeleting] = useState<LoyaltyCard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const edit = (card: LoyaltyCard | null) => {
    onClose();
    setTarget({ card });
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Loyalty cards"
        footer={
          <Button icon={<Plus />} onClick={() => edit(null)}>
            Add card
          </Button>
        }
      >
        {loading ? null : cards.length === 0 ? (
          <p className={s.muted}>Add your store loyalty cards to show them at the register.</p>
        ) : (
          <ul className={s.list}>
            {cards.map((card) => (
              <li key={card.id} className={s.row}>
                <button
                  type="button"
                  className={s.show}
                  aria-label={`Show ${card.name} full size`}
                  onClick={() => {
                    onClose();
                    setShown(card);
                  }}
                >
                  <span className={s.icon}>{card.format === "qr" ? <QrCode /> : <Barcode />}</span>
                  <span className={s.name}>{card.name}</span>
                </button>
                <IconButton label={`Edit ${card.name}`} onClick={() => edit(card)}>
                  <Pencil />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <CodeOverlay card={shown} onClose={() => setShown(null)} />
      <CardSheet
        target={target}
        onClose={() => setTarget(null)}
        onDelete={(card) => {
          setDeleting(card);
          setConfirmDelete(true);
        }}
      />
      <ConfirmSheet
        open={confirmDelete}
        title="Delete card?"
        message={`“${deleting?.name}” will be removed.`}
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteCard(deleting.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

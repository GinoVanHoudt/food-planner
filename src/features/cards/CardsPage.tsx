import { Pencil, Plus, WalletCards } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "../../ui/Button";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { EmptyState } from "../../ui/EmptyState";
import { Card, Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { CardCode } from "./CardCode";
import { deleteCard, useCards, type LoyaltyCard } from "./cards";
import { CardSheet, type CardTarget } from "./CardSheet";
import s from "./CardsPage.module.css";
import { CodeOverlay } from "./CodeOverlay";

export function CardsPage() {
  const { cards, loading } = useCards();
  const [target, setTarget] = useState<CardTarget | null>(null);
  const [shown, setShown] = useState<LoyaltyCard | null>(null);
  // Kept after the confirmation closes so its text stays put while it animates out.
  const [deleting, setDeleting] = useState<LoyaltyCard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addCard = () => setTarget({ card: null });

  return (
    <>
      <PageHeader
        title="Cards"
        actions={
          <Button variant="primary" size="sm" icon={<Plus />} onClick={addCard}>
            New
          </Button>
        }
      />
      <Page>
        {loading ? null : cards.length === 0 ? (
          <EmptyState
            icon={<WalletCards />}
            title="No cards yet"
            text="Add your store loyalty cards to show them at the register."
          >
            <Button variant="primary" icon={<Plus />} onClick={addCard}>
              Add a card
            </Button>
          </EmptyState>
        ) : (
          <div className={s.list}>
            {cards.map((card) => (
              <Card
                key={card.id}
                title={card.name}
                actions={
                  <IconButton label="Edit card" onClick={() => setTarget({ card })}>
                    <Pencil />
                  </IconButton>
                }
              >
                <button
                  type="button"
                  className={s.codeButton}
                  aria-label={`Show ${card.name} full size`}
                  onClick={() => setShown(card)}
                >
                  <CardCode format={card.format} value={card.value} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </Page>

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

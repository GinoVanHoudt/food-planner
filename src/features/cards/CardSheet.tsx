import { Barcode, QrCode, Trash } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Field, Input } from "../../ui/Field";
import { Sheet } from "../../ui/Sheet";
import { cleanDigits, toEan13, type CardFormat } from "./barcode";
import { CardCode } from "./CardCode";
import {
  MAX_CARD_NAME_LENGTH,
  MAX_CARD_VALUE_LENGTH,
  saveCard,
  type LoyaltyCard,
  type LoyaltyCardInput,
} from "./cards";
import s from "./CardSheet.module.css";

/** The card to edit, or null for a new one. Pass a new object each time the sheet opens. */
export interface CardTarget {
  card: LoyaltyCard | null;
}

const FORMATS: { value: CardFormat; label: string; icon: ReactNode }[] = [
  { value: "qr", label: "QR code", icon: <QrCode /> },
  { value: "ean13", label: "Barcode", icon: <Barcode /> },
];

const EMPTY_CARD: LoyaltyCardInput = { name: "", format: "qr", value: "" };

interface CardSheetProps {
  target: CardTarget | null;
  onClose: () => void;
  onDelete: (card: LoyaltyCard) => void;
}

/** Adds or edits a loyalty card, with a preview of its code. */
export function CardSheet({ target, onClose, onDelete }: CardSheetProps) {
  const formId = useId();
  const [openedFor, setOpenedFor] = useState<CardTarget | null>(null);
  const [draft, setDraft] = useState<LoyaltyCardInput>(EMPTY_CARD);

  // Start a fresh draft whenever the sheet opens.
  if (target && target !== openedFor) {
    setOpenedFor(target);
    setDraft(target.card ?? EMPTY_CARD);
  }

  const card = (target ?? openedFor)?.card ?? null;
  const isBarcode = draft.format === "ean13";
  const name = draft.name.trim();
  const value = isBarcode ? cleanDigits(draft.value) : draft.value.trim();
  const validValue = isBarcode ? toEan13(value) !== null : value !== "";
  // Only complain about a barcode once all its digits could have been typed.
  const showError = isBarcode && !validValue && (value.length >= 12 || /\D/.test(value));

  const update = (changes: Partial<LoyaltyCardInput>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!name || !validValue) return;
    saveCard(card?.id, { name, format: draft.format, value });
    onClose();
  };

  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      title={card ? "Edit card" : "New card"}
      footer={
        <>
          {card && (
            <Button
              variant="danger"
              icon={<Trash />}
              onClick={() => {
                onClose();
                onDelete(card);
              }}
            >
              Delete
            </Button>
          )}
          <Button type="submit" form={formId} variant="primary" disabled={!name || !validValue}>
            Save
          </Button>
        </>
      }
    >
      <form id={formId} className={s.form} onSubmit={save}>
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="e.g. Colruyt Xtra"
            maxLength={MAX_CARD_NAME_LENGTH}
          />
        </Field>
        <ChipRow>
          {FORMATS.map(({ value: format, label, icon }) => (
            <Chip
              key={format}
              icon={icon}
              selected={draft.format === format}
              onClick={() => update({ format })}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
        <Field
          label={isBarcode ? "Card number" : "QR code contents"}
          hint={
            isBarcode
              ? "The 12 or 13 digits under the barcode (EAN-13 or UPC-A)."
              : "The text or link in the QR code. Your phone camera shows it when you scan the code."
          }
        >
          <Input
            value={draft.value}
            onChange={(event) => update({ value: event.target.value })}
            inputMode={isBarcode ? "numeric" : undefined}
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_CARD_VALUE_LENGTH}
          />
        </Field>
        {showError && <p className={s.error}>These digits are not a valid barcode number.</p>}
        {validValue && <CardCode format={draft.format} value={value} />}
      </form>
    </Sheet>
  );
}

import { EllipsisVertical } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cx } from "../../lib/cx";
import { capitalize, formatAmounts } from "../../lib/units";
import { IconButton } from "../../ui/Button";
import s from "./ItemRow.module.css";
import { setChecked, type ShoppingItem } from "./shopping";

/** How long the check animation plays before the item moves to / from the cart. */
const MOVE_DELAY_MS = 280;
/** Give up showing the requested state if the write never shows up (e.g. it was rejected). */
const PENDING_TIMEOUT_MS = 3000;

interface ItemRowProps {
  item: ShoppingItem;
  onOptions: () => void;
}

export function ItemRow({ item, onOptions }: ItemRowProps) {
  // The state the user tapped, shown until the Firestore snapshot catches up and the row moves.
  const [target, setTarget] = useState<boolean | null>(null);
  if (target !== null && item.checked === target) setTarget(null);
  const checked = target ?? item.checked;

  useEffect(() => {
    if (target === null) return;
    const timer = setTimeout(() => setTarget(null), PENDING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [target]);

  const toggle = () => {
    if (target !== null) return;
    const next = !item.checked;
    setTarget(next);
    // Not cleared on unmount on purpose: the tap must be saved even if the row disappears.
    setTimeout(() => setChecked(item.id, next), MOVE_DELAY_MS);
  };

  return (
    <motion.li
      layout
      className={s.wrapper}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, x: item.checked ? -48 : 48 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={cx(s.item, checked && s.checked)}>
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          className={s.toggle}
          onClick={toggle}
        >
          <span className={s.box} aria-hidden>
            <svg viewBox="0 0 24 24">
              <motion.path
                d="M6 12.5l4 4 8-9"
                initial={false}
                animate={{ pathLength: checked ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </svg>
          </span>
          <span className={s.text}>
            <span className={s.name}>{capitalize(item.name)}</span>
            {item.sources.length > 0 && (
              <span className={s.sources}>{item.sources.map(capitalize).join(", ")}</span>
            )}
          </span>
          <span className={s.amount}>{formatAmounts(item.amounts)}</span>
        </button>
        <IconButton label={`Options for ${item.name}`} onClick={onOptions}>
          <EllipsisVertical />
        </IconButton>
      </div>
    </motion.li>
  );
}

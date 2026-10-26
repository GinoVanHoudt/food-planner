import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useModal } from "../../lib/useModal";
import { useWakeLock } from "../../lib/useWakeLock";
import { CardCode } from "./CardCode";
import type { LoyaltyCard } from "./cards";
import s from "./CodeOverlay.module.css";

const transition = { duration: 0.18, ease: "easeOut" } as const;

/**
 * A card's code shown big above the page for scanning at the register, keeping the screen on.
 * A tap anywhere closes it.
 */
export function CodeOverlay({ card, onClose }: { card: LoyaltyCard | null; onClose: () => void }) {
  const open = card !== null;
  const panelRef = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panelRef);
  useWakeLock(open);

  return createPortal(
    <AnimatePresence>
      {card && (
        <motion.div
          className={s.root}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${card.name} card`}
            tabIndex={-1}
            className={s.panel}
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            transition={transition}
          >
            <CardCode format={card.format} value={card.value} large />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

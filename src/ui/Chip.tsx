import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import s from "./Chip.module.css";

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
}

/** Toggle chip; renders as a static tag when it has no onClick. */
export function Chip({ selected = false, onClick, icon, children }: ChipProps) {
  if (!onClick) {
    return <span className={cx(s.chip, s.static)}>{children}</span>;
  }
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      aria-pressed={selected}
      className={cx(s.chip, selected && s.selected)}
      onClick={onClick}
    >
      {icon}
      {children}
    </motion.button>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}

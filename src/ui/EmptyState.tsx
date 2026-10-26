import { motion } from "motion/react";
import type { ReactNode } from "react";
import s from "./EmptyState.module.css";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  text?: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, text, children }: EmptyStateProps) {
  return (
    <motion.div
      className={s.empty}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        className={s.icon}
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.05 }}
      >
        {icon}
      </motion.div>
      <h2 className={s.title}>{title}</h2>
      {text && <p className={s.text}>{text}</p>}
      {children}
    </motion.div>
  );
}

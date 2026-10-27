import { motion } from "motion/react";
import type { ReactNode } from "react";
import s from "./ListGroup.module.css";

interface ListGroupProps {
  title: string;
  count: number;
  /** The `<li>` rows. */
  children: ReactNode;
}

/** A titled card of list rows, like a store section or an inventory location. */
export function ListGroup({ title, count, children }: ListGroupProps) {
  return (
    <motion.section
      layout
      className={s.group}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h2 className={s.title}>
        {title}
        <span className={s.count}>{count}</span>
      </h2>
      <ul>{children}</ul>
    </motion.section>
  );
}

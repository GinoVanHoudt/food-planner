import { motion } from "motion/react";
import type { ReactNode } from "react";
import s from "./AuthLayout.module.css";

/** Centered card with the app logo, used for sign-in and access screens. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={s.screen}>
      <motion.div
        className={s.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
      >
        <motion.img
          src="/logo.svg"
          alt=""
          className={s.logo}
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.1 }}
        />
        <h1 className={s.title}>{title}</h1>
        {children}
      </motion.div>
    </main>
  );
}

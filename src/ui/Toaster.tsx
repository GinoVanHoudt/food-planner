import { AnimatePresence, motion } from "motion/react";
import { cx } from "../lib/cx";
import { useToasts } from "./toast";
import s from "./Toaster.module.css";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className={s.toaster} aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            role={toast.tone === "error" ? "alert" : "status"}
            className={cx(s.toast, toast.tone === "error" && s.error)}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

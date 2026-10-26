import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useLocation, useOutlet } from "react-router";
import s from "./AppShell.module.css";
import { NavBar } from "./NavBar";

/** Keeps rendering the page it was created with, so the old page can animate out. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className={s.shell}>
      <NavBar />
      <main className={s.main}>
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

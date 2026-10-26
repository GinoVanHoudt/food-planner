import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import s from "./Stepper.module.css";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
}

export function Stepper({ value, onChange, label, min = 1, max = 99 }: StepperProps) {
  return (
    <div className={s.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={s.step}
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </button>
      <span className={s.value} aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        className={s.step}
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus />
      </button>
    </div>
  );
}

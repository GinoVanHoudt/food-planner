import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import s from "./Button.module.css";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  icon?: ReactNode;
  block?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  block,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      className={cx(s.button, s[variant], s[size], block && s.block, className)}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  );
}

type IconButtonProps = HTMLMotionProps<"button"> & {
  label: string;
  children: ReactNode;
};

export function IconButton({
  label,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      title={label}
      className={cx(s.iconButton, className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

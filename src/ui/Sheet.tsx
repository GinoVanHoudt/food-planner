import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DESKTOP_QUERY, useMediaQuery } from "../lib/useMediaQuery";
import { IconButton } from "./Button";
import s from "./Sheet.module.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const spring = { type: "spring", damping: 34, stiffness: 380 } as const;

/** Bottom sheet on mobile (drag the handle down to dismiss), centered dialog on desktop. */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const titleId = useId();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  const hidden = isDesktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: "100%" };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={s.root}>
          <motion.div
            className={s.backdrop}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={s.panel}
            initial={hidden}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={hidden}
            transition={spring}
            drag={isDesktop ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div className={s.grabArea} onPointerDown={(event) => dragControls.start(event)}>
              <div className={s.handle} />
              <header className={s.header}>
                <h2 id={titleId} className={s.title}>
                  {title}
                </h2>
                <IconButton label="Close" onClick={onClose}>
                  <X />
                </IconButton>
              </header>
            </div>
            <div className={s.body}>{children}</div>
            {footer && <footer className={s.footer}>{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

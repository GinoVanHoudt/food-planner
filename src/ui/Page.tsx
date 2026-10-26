import type { ReactNode } from "react";
import s from "./Page.module.css";

/** Padded page body below a PageHeader. */
export function Page({ children }: { children: ReactNode }) {
  return <div className={s.page}>{children}</div>;
}

/** A titled card section on a page. */
export function Card({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={s.card}>
      {(title || actions) && (
        <header className={s.cardHeader}>
          {title && <h2 className={s.cardTitle}>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

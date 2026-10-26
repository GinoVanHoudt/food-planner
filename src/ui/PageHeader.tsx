import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { IconButton } from "./Button";
import s from "./PageHeader.module.css";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Shows a back button that goes to this path. */
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={s.header}>
      {backTo && (
        <IconButton label="Back" className={s.back} onClick={() => navigate(backTo)}>
          <ChevronLeft />
        </IconButton>
      )}
      <div className={s.titles}>
        <h1 className={s.title}>{title}</h1>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}

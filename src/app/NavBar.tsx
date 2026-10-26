import { BookOpen, CalendarDays, Settings, ShoppingCart, WalletCards } from "lucide-react";
import { motion } from "motion/react";
import { NavLink } from "react-router";
import { cx } from "../lib/cx";
import { useShopping } from "../features/shopping/shopping";
import s from "./NavBar.module.css";

const TABS = [
  { to: "/", label: "Plan", icon: CalendarDays },
  { to: "/recipes", label: "Recipes", icon: BookOpen },
  { to: "/shopping", label: "Shop", icon: ShoppingCart },
  { to: "/cards", label: "Cards", icon: WalletCards },
  { to: "/settings", label: "Settings", icon: Settings },
];

/** Bottom tab bar on mobile, sidebar on desktop. */
export function NavBar() {
  const { items } = useShopping();
  const toBuy = items.filter((item) => !item.checked).length;

  return (
    <nav className={s.nav} aria-label="Main">
      <div className={s.brand}>
        <img src="/logo.svg" alt="" className={s.logo} />
        Food Planner
      </div>
      <ul className={s.tabs}>
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) => cx(s.tab, isActive && s.active)}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className={s.indicator}
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className={s.icon}>
                    <Icon aria-hidden />
                    {to === "/shopping" && toBuy > 0 && (
                      <motion.span
                        key={toBuy}
                        className={s.badge}
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        {toBuy}
                      </motion.span>
                    )}
                  </span>
                  <span className={s.label}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

// The inline script in index.html reads the same key to apply the theme before the first paint.
const STORAGE_KEY = "theme";

// Matches --bg in tokens.css; Chrome tints its UI (e.g. Android's status bar) with it.
const THEME_COLORS = { light: "#f6f5f1", dark: "#121412" };

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

let preference = readPreference();
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

function apply() {
  const theme = preference === "system" ? (systemDark.matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = theme;
  // index.html has one meta per system scheme; giving both the same colour makes the choice win.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = THEME_COLORS[theme];
  }
}

/** Applies the saved theme and keeps following the device while the preference is "system". */
export function watchTheme() {
  apply();
  systemDark.addEventListener("change", apply);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setPreference(next: ThemePreference) {
  preference = next;
  if (next === "system") localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, next);
  apply();
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  return { preference: useSyncExternalStore(subscribe, () => preference), setPreference };
}

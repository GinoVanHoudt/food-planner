import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type Platform = "ios" | "android" | "macSafari" | "desktop";

const DISMISSED_KEY = "installPromptDismissedAt";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

let state = {
  deferred: null as BeforeInstallPromptEvent | null,
  open: false,
  snoozed: Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < SNOOZE_MS,
};
const listeners = new Set<() => void>();

function update(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

/**
 * Chromium fires `beforeinstallprompt` once, possibly before React renders, so it is captured at
 * startup and kept until the user installs.
 */
export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    update({ deferred: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => update({ deferred: null, open: false }));
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, but with touch support.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1))
    return "ios";
  if (/android/i.test(ua)) return "android";
  if (/macintosh/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|edg|firefox/i.test(ua))
    return "macSafari";
  return "desktop";
}

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const platform = detectPlatform();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const show = () => update({ open: true });

const dismiss = () => {
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  update({ open: false, snoozed: true });
};

const install = async () => {
  const { deferred } = state;
  if (!deferred) return;
  // A prompt event can be used only once; the browser fires a new one if installing is still possible.
  update({ deferred: null, open: false });
  await deferred.prompt();
};

export function useInstallPrompt() {
  const { deferred, open, snoozed } = useSyncExternalStore(subscribe, () => state);
  const canPrompt = deferred !== null;

  return {
    isStandalone,
    platform,
    canPrompt,
    open,
    /** Whether to pop up on its own: not installed, not recently dismissed, and installable here. */
    shouldAutoOpen:
      !isStandalone && !snoozed && (canPrompt || platform === "ios" || platform === "android"),
    show,
    dismiss,
    install,
  };
}

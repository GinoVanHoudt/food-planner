import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "error";
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: Toast[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

export function showToast(message: string, tone: Toast["tone"] = "info") {
  const id = nextId++;
  emit([...toasts.filter((toast) => toast.message !== message), { id, message, tone }]);
  setTimeout(() => emit(toasts.filter((toast) => toast.id !== id)), tone === "error" ? 6000 : 3000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, () => toasts);
}

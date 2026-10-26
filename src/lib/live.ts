import { onSnapshot, type DocumentReference, type Query } from "firebase/firestore";
import { useSyncExternalStore } from "react";

export interface LiveState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

export interface LiveStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => LiveState<T>;
  reset: () => void;
}

const stores = new Set<LiveStore<unknown>>();

/**
 * A Firestore listener shared by every component that reads it. It starts on first use and keeps
 * running (so switching tabs is instant) until `resetLiveStores()` is called on sign-out.
 */
function createLiveStore<T>(
  initial: T,
  listen: (next: (data: T) => void, fail: (error: Error) => void) => () => void,
): LiveStore<T> {
  const empty: LiveState<T> = { data: initial, loading: true, error: null };
  let state = empty;
  let stop: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const emit = (next: LiveState<T>) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const store: LiveStore<T> = {
    subscribe(listener) {
      listeners.add(listener);
      stop ??= listen(
        (data) => emit({ data, loading: false, error: null }),
        (error) => {
          console.error(error);
          emit({ ...state, loading: false, error });
        },
      );
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    reset() {
      stop?.();
      stop = null;
      state = empty;
    },
  };
  stores.add(store as LiveStore<unknown>);
  return store;
}

export function liveCollection<T extends { id: string }>(query: () => Query): LiveStore<T[]> {
  return createLiveStore<T[]>([], (next, fail) =>
    onSnapshot(
      query(),
      (snapshot) =>
        next(
          snapshot.docs.map(
            (doc) => ({ ...doc.data({ serverTimestamps: "estimate" }), id: doc.id }) as T,
          ),
        ),
      fail,
    ),
  );
}

export function liveDocument<T>(ref: () => DocumentReference): LiveStore<T | null> {
  return createLiveStore<T | null>(null, (next, fail) =>
    onSnapshot(ref(), (snapshot) => next(snapshot.exists() ? (snapshot.data() as T) : null), fail),
  );
}

export function useLive<T>(store: LiveStore<T>): LiveState<T> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Stops all listeners so nothing keeps querying after sign-out. */
export function resetLiveStores() {
  stores.forEach((store) => store.reset());
}

import { useEffect } from "react";

/** Keeps the screen from dimming while `active`, where the browser supports the Wake Lock API. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const request = () => {
      navigator.wakeLock.request("screen").then(
        (sentinel) => {
          if (done) void sentinel.release();
          else lock = sentinel;
        },
        // Refused (e.g. battery saver): the screen just dims as usual.
        () => undefined,
      );
    };
    // The browser drops the lock whenever the page is hidden, so take it again on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void lock?.release();
    };
  }, [active]);
}

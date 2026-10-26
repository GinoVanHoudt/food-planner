import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { app, auth, db, usesEmulators } from "../../lib/firebase";
import { resetLiveStores } from "../../lib/live";
import { AuthContext, type AuthStatus } from "./useAuth";

const memberCacheKey = (uid: string) => `member:${uid}`;

/** Membership = a `members/{email}` document exists. Null when it can't be checked (offline). */
async function fetchMembership(user: User): Promise<boolean | null> {
  if (!user.email) return false;
  try {
    const snapshot = await getDoc(doc(db, "members", user.email.toLowerCase()));
    return snapshot.exists();
  } catch (error) {
    return (error as { code?: string }).code === "permission-denied" ? false : null;
  }
}

function describeError(error: unknown): string | null {
  const code = (error as { code?: string }).code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/popup-blocked")
    return "The sign-in popup was blocked. Allow popups and try again.";
  if (code === "auth/network-request-failed")
    return "No connection. Check your internet and try again.";
  return "Sign-in failed. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((redirectError: unknown) =>
      setError(describeError(redirectError)),
    );
    let latest = 0;
    return onAuthStateChanged(auth, async (nextUser) => {
      const run = ++latest;
      if (!nextUser) {
        resetLiveStores();
        setUser(null);
        setStatus("signedOut");
        return;
      }
      // A known member gets in at once: on a flaky connection (in the store) the server check can
      // take ~10 s. The check still runs and can revoke access.
      const cacheKey = memberCacheKey(nextUser.uid);
      const knownMember = localStorage.getItem(cacheKey) === "1";
      if (knownMember) {
        setUser(nextUser);
        setStatus("allowed");
      }
      const member = await fetchMembership(nextUser);
      if (run !== latest || (member === null && knownMember)) return;
      if (member !== null) localStorage.setItem(cacheKey, member ? "1" : "0");
      setUser(nextUser);
      setStatus(member ? "allowed" : "notAllowed");
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    // Redirect only works when the auth handler is same-origin (Firebase Hosting); it is also the
    // only flow that works reliably inside an installed iOS PWA. Localhost uses a popup instead.
    const sameOriginAuth = !usesEmulators && window.location.hostname === app.options.authDomain;
    try {
      if (sameOriginAuth) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
    } catch (signInError) {
      setError(describeError(signInError));
    }
  }, []);

  // Listeners are reset by onAuthStateChanged once the sign-out has actually happened.
  const signOut = useCallback(() => firebaseSignOut(auth), []);

  const value = useMemo(
    () => ({ status, user, error, signIn, signOut }),
    [status, user, error, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

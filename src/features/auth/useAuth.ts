import type { User } from "firebase/auth";
import { createContext, use } from "react";

export type AuthStatus = "loading" | "signedOut" | "notAllowed" | "allowed";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

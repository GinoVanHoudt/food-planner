/** The message to show when signing in fails, or null when the user cancelled it. */
export function describeError(error: unknown): string | null {
  const code = (error as { code?: string } | null | undefined)?.code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/popup-blocked")
    return "The sign-in popup was blocked. Allow popups and try again.";
  if (code === "auth/network-request-failed")
    return "No connection. Check your internet and try again.";
  return "Sign-in failed. Please try again.";
}

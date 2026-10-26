import { motion, MotionConfig } from "motion/react";
import { AuthLayout } from "../features/auth/AuthLayout";
import authStyles from "../features/auth/AuthLayout.module.css";
import { NotAllowedPage } from "../features/auth/NotAllowedPage";
import { SignInPage } from "../features/auth/SignInPage";
import { useAuth } from "../features/auth/useAuth";
import { InstallPrompt } from "../features/pwa/InstallPrompt";
import { UpdateToast } from "../features/pwa/UpdateToast";
import { isConfigured } from "../lib/firebase";
import { Toaster } from "../ui/Toaster";
import { AppShell } from "./AppShell";
import s from "./Root.module.css";

function Splash() {
  return (
    <div className={s.splash}>
      <motion.img
        src="/logo.svg"
        alt="Loading"
        className={s.splashLogo}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function NotConfigured() {
  return (
    <AuthLayout title="Almost there">
      <p className={authStyles.text}>
        Firebase isn’t configured. Add your project’s config to <code>.env.local</code> (see the
        README), or run against the local emulators with <code>vp dev --mode emulator</code>.
      </p>
    </AuthLayout>
  );
}

function Screen() {
  const { status } = useAuth();
  if (!isConfigured) return <NotConfigured />;
  switch (status) {
    case "loading":
      return <Splash />;
    case "signedOut":
      return <SignInPage />;
    case "notAllowed":
      return <NotAllowedPage />;
    case "allowed":
      return <AppShell />;
  }
}

/** Root route: shows the screen for the current auth state plus app-wide overlays. */
export function Root() {
  return (
    <MotionConfig reducedMotion="user">
      <Screen />
      <InstallPrompt />
      <UpdateToast />
      <Toaster />
    </MotionConfig>
  );
}

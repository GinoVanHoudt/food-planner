import { LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/Button";
import { AuthLayout } from "./AuthLayout";
import s from "./AuthLayout.module.css";
import { useAuth } from "./useAuth";

export function SignInPage() {
  const { signIn, error } = useAuth();
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setBusy(true);
    await signIn();
    setBusy(false);
  };

  return (
    <AuthLayout title="Food Planner">
      <p className={s.text}>Plan your meals together and turn them into a shopping list.</p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <Button variant="primary" block icon={<LogIn />} onClick={onSignIn} disabled={busy}>
        Sign in with Google
      </Button>
    </AuthLayout>
  );
}

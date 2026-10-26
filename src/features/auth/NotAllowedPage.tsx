import { LogOut } from "lucide-react";
import { Button } from "../../ui/Button";
import { AuthLayout } from "./AuthLayout";
import s from "./AuthLayout.module.css";
import { useAuth } from "./useAuth";

export function NotAllowedPage() {
  const { user, signOut } = useAuth();
  return (
    <AuthLayout title="No access">
      <p className={s.text}>
        <strong>{user?.email}</strong> isn’t allowed to use this app. Sign in with a different
        Google account.
      </p>
      <Button block icon={<LogOut />} onClick={signOut}>
        Sign out
      </Button>
    </AuthLayout>
  );
}

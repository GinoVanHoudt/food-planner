import { Download, LogOut, SunMoon } from "lucide-react";
import { Button } from "../../ui/Button";
import { Card, Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/useAuth";
import { useInstallPrompt } from "../pwa/useInstallPrompt";
import { SectionsEditor } from "./SectionsEditor";
import s from "./SettingsPage.module.css";

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const install = useInstallPrompt();

  return (
    <>
      <PageHeader title="Settings" />
      <Page>
        <div className={s.columns}>
          <Card title="Store sections">
            <p className={s.hint}>
              Drag the sections into the order you walk through your store. The shopping list
              follows this order.
            </p>
            <SectionsEditor />
          </Card>
          <div className={s.stack}>
            <Card title="Account">
              <div className={s.account}>
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className={s.avatar}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className={s.avatar}>{user?.displayName?.[0] ?? "?"}</span>
                )}
                <span className={s.who}>
                  <strong>{user?.displayName}</strong>
                  <span className={s.hint}>{user?.email}</span>
                </span>
              </div>
              <Button icon={<LogOut />} onClick={signOut}>
                Sign out
              </Button>
            </Card>
            <Card title="App">
              <p className={s.row}>
                <SunMoon aria-hidden />
                Light and dark mode follow your device settings.
              </p>
              {!install.isStandalone && (
                <Button icon={<Download />} onClick={install.show}>
                  Install app
                </Button>
              )}
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}

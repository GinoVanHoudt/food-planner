import { Download, LogOut, Moon, Sun, SunMoon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Card, Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/useAuth";
import { useInstallPrompt } from "../pwa/useInstallPrompt";
import { SectionsEditor } from "./SectionsEditor";
import s from "./SettingsPage.module.css";
import { useTheme, type ThemePreference } from "./useTheme";

const THEMES: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: "system", label: "System", icon: <SunMoon /> },
  { value: "light", label: "Light", icon: <Sun /> },
  { value: "dark", label: "Dark", icon: <Moon /> },
];

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const install = useInstallPrompt();
  const theme = useTheme();

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
            <Card title="App">
              <div className={s.group}>
                <h3 className={s.heading}>Theme</h3>
                <ChipRow>
                  {THEMES.map(({ value, label, icon }) => (
                    <Chip
                      key={value}
                      icon={icon}
                      selected={theme.preference === value}
                      onClick={() => theme.setPreference(value)}
                    >
                      {label}
                    </Chip>
                  ))}
                </ChipRow>
              </div>
              {!install.isStandalone && (
                <Button icon={<Download />} onClick={install.show}>
                  Install app
                </Button>
              )}
            </Card>
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
          </div>
        </div>
      </Page>
    </>
  );
}

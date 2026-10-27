import { Download, LogOut, Moon, Sun, SunMoon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Card, Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { OrderedListEditor } from "../../ui/OrderedListEditor";
import { useAuth } from "../auth/useAuth";
import { useInstallPrompt } from "../pwa/useInstallPrompt";
import { OTHER_LOCATION_ID, saveLocations, useLocations } from "./locations";
import { OTHER_SECTION_ID, saveSections, useSections } from "./sections";
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
  const sections = useSections();
  const locations = useLocations();

  return (
    <>
      <PageHeader title="Settings" />
      <Page>
        <div className={s.columns}>
          <div className={s.stack}>
            <Card title="Store sections">
              <p className={s.hint}>
                Drag the sections into the order you walk through your store. The shopping list
                follows this order.
              </p>
              <OrderedListEditor
                items={sections}
                onSave={saveSections}
                fixedId={OTHER_SECTION_ID}
                noun="section"
                placeholder="New section, e.g. Spices"
              />
            </Card>
            <Card title="Inventory locations">
              <p className={s.hint}>
                The places at home where you keep food, in the order you like.
              </p>
              <OrderedListEditor
                items={locations}
                onSave={saveLocations}
                fixedId={OTHER_LOCATION_ID}
                noun="location"
                placeholder="New location, e.g. Cellar"
              />
            </Card>
          </div>
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

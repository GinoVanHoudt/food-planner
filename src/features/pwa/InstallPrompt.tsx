import { Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import s from "./InstallPrompt.module.css";
import type { Platform } from "./platform";
import { useInstallPrompt } from "./useInstallPrompt";

const AUTO_OPEN_DELAY_MS = 2500;

function Steps({ platform }: { platform: Platform }) {
  const steps: { icon: ReactNode; text: ReactNode }[] =
    platform === "ios"
      ? [
          {
            icon: <Share />,
            text: (
              <>
                Tap <strong>Share</strong> in the browser toolbar (on newer iOS it’s inside the{" "}
                <strong>⋯</strong> menu).
              </>
            ),
          },
          {
            icon: <SquarePlus />,
            text: (
              <>
                Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
              </>
            ),
          },
        ]
      : platform === "android"
        ? [
            {
              icon: <EllipsisVertical />,
              text: (
                <>
                  Open the browser menu <strong>⋮</strong>.
                </>
              ),
            },
            {
              icon: <Download />,
              text: (
                <>
                  Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </>
              ),
            },
          ]
        : platform === "macSafari"
          ? [
              {
                icon: <SquarePlus />,
                text: (
                  <>
                    In the menu bar choose <strong>File → Add to Dock</strong>.
                  </>
                ),
              },
            ]
          : [
              {
                icon: <Download />,
                text: (
                  <>
                    Open this page in <strong>Chrome</strong> or <strong>Edge</strong> and use the
                    install icon in the address bar.
                  </>
                ),
              },
            ];

  return (
    <ol className={s.steps}>
      {steps.map((step, index) => (
        <motion.li
          key={index}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + index * 0.1 }}
        >
          <span className={s.stepIcon}>{step.icon}</span>
          <span>{step.text}</span>
        </motion.li>
      ))}
    </ol>
  );
}

/** Pops up (once a week at most) when the app runs in a browser tab instead of as an installed app. */
export function InstallPrompt() {
  const prompt = useInstallPrompt();
  const { shouldAutoOpen, show } = prompt;

  useEffect(() => {
    if (!shouldAutoOpen) return;
    const timer = setTimeout(show, AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldAutoOpen, show]);

  return (
    <Sheet
      open={prompt.open}
      onClose={prompt.dismiss}
      title="Install Food Planner"
      footer={
        <>
          <Button onClick={prompt.dismiss}>Not now</Button>
          {prompt.canPrompt && (
            <Button variant="primary" icon={<Download />} onClick={prompt.install}>
              Install
            </Button>
          )}
        </>
      }
    >
      <div className={s.content}>
        <div className={s.intro}>
          <motion.img
            src="/logo.svg"
            alt=""
            className={s.logo}
            initial={{ scale: 0.6, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 12 }}
          />
          <p>
            Add the app to your home screen: it opens full screen and keeps working offline in the
            store.
          </p>
        </div>
        {!prompt.canPrompt && <Steps platform={prompt.platform} />}
        {prompt.platform === "ios" && (
          <p className={s.note}>
            The installed app has its own login, so you sign in once more after opening it.
          </p>
        )}
      </div>
    </Sheet>
  );
}

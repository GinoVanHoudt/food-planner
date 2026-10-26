import { RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../../ui/Button";
import s from "./UpdateToast.module.css";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Offers a reload when a new version has been deployed and its service worker is waiting. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          className={s.toast}
          role="status"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
        >
          <span>A new version is available.</span>
          <Button
            variant="primary"
            size="sm"
            icon={<RefreshCw />}
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

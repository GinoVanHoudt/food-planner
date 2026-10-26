import { showToast } from "../ui/toast";

/**
 * Fires a Firestore write without awaiting it. Offline writes resolve only once the device is back
 * online, but the local cache updates instantly, so the UI should never wait on them.
 */
export function persist(write: Promise<unknown>, action = "Saving") {
  write.catch((error: unknown) => {
    console.error(error);
    showToast(`${action} failed. Check your connection and try again.`, "error");
  });
}

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

/** `vp dev --mode emulator` talks to the local Firebase emulators instead of the real project. */
export const usesEmulators = import.meta.env.MODE === "emulator";

const projectConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const emulatorConfig: FirebaseOptions = {
  apiKey: "demo-api-key",
  authDomain: "localhost",
  projectId: "demo-food-planner",
};

export const isConfigured =
  usesEmulators || Boolean(projectConfig.apiKey && projectConfig.projectId);

export const app = initializeApp(usesEmulators || !isConfigured ? emulatorConfig : projectConfig);

export const auth = getAuth(app);

// The persistent cache keeps the app usable offline (e.g. in the store) and syncs when back online.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (usesEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

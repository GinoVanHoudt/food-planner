import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./app/router";
import { AuthProvider } from "./features/auth/AuthProvider";
import { captureInstallPrompt } from "./features/pwa/useInstallPrompt";
import { watchTheme } from "./features/settings/useTheme";
import "./styles/tokens.css";
import "./styles/global.css";

captureInstallPrompt();
watchTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);

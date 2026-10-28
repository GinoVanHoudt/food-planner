import { minimal2023Preset } from "@vite-pwa/assets-generator/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, lazyPlugins } from "vite-plus";

// The logo is a full-bleed square, so icons need no extra padding (it is already maskable-safe).
// The browser favicon is public/favicon.svg instead (just the cup), linked in index.html.
const iconPreset = {
  ...minimal2023Preset,
  transparent: { ...minimal2023Preset.transparent, padding: 0, favicons: [] },
  maskable: { ...minimal2023Preset.maskable, padding: 0 },
  apple: { ...minimal2023Preset.apple, padding: 0 },
};

// https://vite.dev/config/
export default defineConfig({
  fmt: {},
  lint: {
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  build: {
    // Firebase alone is ~600 kB; vendor chunks stay cached across app deploys.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "firebase", test: /node_modules[\\/].*(@firebase|firebase)[\\/]/ },
            {
              name: "react",
              test: /node_modules[\\/].*(react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              name: "motion",
              test: /node_modules[\\/].*(motion|framer-motion|motion-dom|motion-utils)[\\/]/,
            },
          ],
        },
      },
    },
  },
  plugins: lazyPlugins(() => [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      pwaAssets: {
        image: "public/logo.svg",
        preset: iconPreset,
        overrideManifestIcons: true,
        injectThemeColor: false,
        includeHtmlHeadLinks: false,
      },
      manifest: {
        name: "Food Planner",
        short_name: "Food Planner",
        description: "Plan meals and groceries together",
        lang: "en",
        display: "standalone",
        start_url: "/",
        scope: "/",
        // Chrome on Android paints an installed app's navigation bar with one of these (which one
        // varies by version), and the page cannot change it at runtime (the theme-color meta only
        // reaches the status bar). Use the dark --bg for both so the bar stays dark in both themes.
        theme_color: "#121412",
        background_color: "#121412",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        // Firebase Auth's redirect handler lives under /__/ and must never be served from the SW.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ]),
});

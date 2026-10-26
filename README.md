# Food Planner

Plan lunch and dinner for the next two weeks together, keep your recipes in one place, and turn the
plan into a shopping list you check off in the store. Works on phones (installable PWA for Android
and iOS) and on the desktop, in light and dark mode.

- **Plan**: 14 days ahead, one or more recipes per lunch/dinner with servings, or a note such as
  “Leftovers” or “Eating out”.
- **Recipes**: ingredients, servings (default 4), instructions, source link and tags; paste a whole
  ingredient list at once.
- **Shopping**: generate a list for any date range; quantities are scaled, duplicates merged and
  items grouped by store section in your store’s walking order. Checked items move to “In cart”.
  Both phones stay in sync live, and the list works offline in the store.
- **Private**: Google sign-in, and only the accounts you allow can read or change anything.

## Tech

Vite+ · React · TypeScript · Firebase Auth + Firestore · Firebase Hosting · GitHub Actions.
See [`CLAUDE.md`](CLAUDE.md) for architecture and conventions, [`PLAN.md`](PLAN.md) for the plan.

## One-time setup

Everything stays on Firebase’s free Spark plan. Replace `<project-id>` with your Firebase project id.

### 1. Firebase project

1. In the [Firebase console](https://console.firebase.google.com), **Add project** (Google Analytics
   is not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**, pick a support
   email, **Save**.
3. **Build → Firestore Database → Create database**, start in **production mode**, location e.g.
   `europe-west1 (Belgium)` (cannot be changed later).
4. **Build → Hosting → Get started** and click through (deploys happen from GitHub). This reserves
   `https://<project-id>.web.app`.
5. **Project settings → General → Your apps → Web (`</>`)**, register an app (no hosting setup
   needed) and note `apiKey`, `projectId` and `appId`.
6. **Firestore → Data → Start collection** `members`. Add one document per person who may use the
   app: **Document ID** = the Google account email in lower case, with a string field `name`.

### 2. Google sign-in inside the installed app

The app uses `<project-id>.web.app` as its auth domain, which keeps sign-in working inside the
installed iOS app.

1. [Google Cloud console](https://console.cloud.google.com) (same project) → **APIs & Services →
   Credentials → OAuth 2.0 Client IDs → Web client (auto created by Google Service)**.
2. Under **Authorized redirect URIs** add `https://<project-id>.web.app/__/auth/handler` and save.
3. Firebase → **Authentication → Settings → Authorized domains** should list `<project-id>.web.app`
   (it does by default).

### 3. Deploy account for GitHub Actions

1. Google Cloud console → **IAM & Admin → Service accounts → Create service account**, e.g.
   `github-deploy`.
2. Grant the roles **Firebase Admin** and **Service Usage Consumer**.
3. Open the account → **Keys → Add key → JSON** (downloads a file).
4. GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**:
   name `FIREBASE_SERVICE_ACCOUNT`, value = the whole JSON file. Delete the downloaded file.

### 4. GitHub repository variables

Same page, **Variables** tab → add:

| Variable                    | Value                                    |
| --------------------------- | ---------------------------------------- |
| `VITE_FIREBASE_API_KEY`     | `apiKey`                                 |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project-id>.web.app` (not firebaseapp) |
| `VITE_FIREBASE_PROJECT_ID`  | `projectId`                              |
| `VITE_FIREBASE_APP_ID`      | `appId`                                  |

These values are public by design; the Firestore security rules protect the data.

### 5. Deploy

Push to `main`. The **Build and deploy** workflow checks, tests and builds the app, then deploys
hosting and `firestore.rules`. Open `https://<project-id>.web.app`, sign in, and install it:

- **Android (Chrome)**: the app offers an **Install** button, or use menu ⋮ → **Install app**.
- **iPhone/iPad**: Share (inside the ⋯ menu on newer iOS) → **Add to Home Screen**. Sign in again
  inside the installed app; it has its own storage.

### Optional hardening

- After you both signed in once: **Authentication → Settings → User actions** → turn off **Enable
  create (sign-up)** so no new accounts can be created at all.
- Google Cloud → **Credentials → Browser key → Application restrictions → Websites**: allow only
  `https://<project-id>.web.app/*`, `https://<project-id>.firebaseapp.com/*` and
  `http://localhost:5173/*`.

## Local development

Requires the [Vite+ CLI](https://viteplus.dev/guide/) (`vp`).

```sh
vp install
```

**Against local emulators** (no Firebase project needed; requires Java 21+):

```sh
vp run emulators                 # terminal 1: Auth + Firestore emulators, UI on http://localhost:4000
vp run seed you@example.com      # terminal 2: member + sample recipes and plan
vp run dev:emulators             # terminal 2: http://localhost:5173
```

Sign in through the emulator’s fake Google screen with **Add new account** and the same email.

**Against your real project**: create `.env.local` (git-ignored) with:

```sh
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

then run `vp dev`. Localhost signs in with a popup, so the `firebaseapp.com` auth domain is fine here.

| Command      | What it does                   |
| ------------ | ------------------------------ |
| `vp check`   | Format check, lint, type-check |
| `vp test`    | Unit tests                     |
| `vp build`   | Production build into `dist/`  |
| `vp preview` | Serve the production build     |

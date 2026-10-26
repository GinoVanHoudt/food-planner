# Food Planner — Plan

A mobile-first PWA for two people to plan lunch and dinner for the next 14 days, manage recipes, and turn the plan into a shared shopping list they can check off in the store.

## Decisions

| Topic          | Decision                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Toolchain      | Vite+ (`vp`) — Vite 8, Vitest 5, Oxlint, Oxfmt, tsgolint type-check                             |
| Framework      | React + TypeScript                                                                              |
| Backend        | Firebase (free Spark plan): Auth (Google) + Cloud Firestore                                     |
| Hosting        | Firebase Hosting (`<project>.web.app`), deployed by GitHub Actions on push to `main`            |
| Access         | Login with Google; only emails listed in Firestore `members` collection can read/write data     |
| Language       | English UI, metric units                                                                        |
| Planner        | Rolling 14 days from today (past week reachable via "Show earlier")                             |
| Meal slot      | One or more recipes (each with servings) + optional free-text note (e.g. "Leftovers")           |
| Servings       | Recipes default to 4 servings; a planned recipe can override; shopping quantities scale         |
| Shopping list  | Pick date range, merge duplicates, group by store section, manual extra items                   |
| Store sections | Ordered list in Settings, drag to reorder to match the store layout                             |
| Recipe fields  | Name, servings, ingredients, instructions/notes, source link, tags                              |
| Navigation     | Bottom tab bar (Plan · Recipes · Shop · Settings) → left sidebar on desktop (≥ 900px)           |
| Planner UI     | Vertical day cards; tap lunch/dinner row → bottom-sheet recipe picker; desktop 7-col grid       |
| Shopping UI    | Checked items fly into a collapsed "In cart" group at the bottom                                |
| Code layout    | Feature folders + CSS Modules + design tokens (light/dark CSS variables), no UI library         |
| Theme          | Follows system by default; Settings can pin light or dark per device (localStorage)             |
| Animations     | `motion` (page transitions, sheet, list enter/exit, check-off, reorder); honours reduced motion |
| PWA            | `vite-plugin-pwa` (manifest, icons, Workbox SW); install popup when not running standalone      |

## Architecture

```
src/
├─ app/            App shell, router, layout (tab bar / sidebar), providers
├─ features/
│  ├─ auth/        useAuth, SignInPage, NotAllowedPage
│  ├─ planner/     PlanPage, DayCard, MealSheet, usePlan
│  ├─ recipes/     RecipesPage, RecipeEditPage, RecipeForm, useRecipes
│  ├─ shopping/    ShoppingPage, GenerateSheet, buildList (+ test), useShopping
│  ├─ settings/    SettingsPage, SectionsEditor, useSections
│  └─ pwa/         InstallPrompt, useInstallPrompt
├─ lib/
│  ├─ firebase.ts  init app, auth, Firestore (persistent offline cache, emulator switch)
│  ├─ firestore.ts small typed hooks: useCollection / useDocument
│  ├─ dates.ts     day keys (YYYY-MM-DD), 14-day window, formatting
│  └─ units.ts     scale, normalise (g/kg, ml/l), merge, format quantities
├─ ui/             Button, IconButton, Sheet, Stepper, Chip, Checkbox, EmptyState, icons
└─ styles/         tokens.css (light/dark variables), global.css
```

Data flows straight from Firestore `onSnapshot` listeners into React via small hooks. Firestore's persistent local cache makes the app work offline (in the store) and syncs both phones live.

### Firestore data model

```
members/{email}        { name? }                                    allowlist, managed in Firebase console
recipes/{id}           { name, servings, ingredients: Ingredient[], instructions, sourceUrl, tags[], createdAt, updatedAt }
                       Ingredient = { name, quantity: number | null, unit }
plan/{YYYY-MM-DD}      { lunch?: Slot, dinner?: Slot }
                       Slot = { recipes: { recipeId, servings }[], note }
ingredients/{key}      { name, sectionId }                          catalog: autocomplete + remembered store section
settings/sections      { sections: { id, name }[] }                 ordered store sections
settings/shopping      { from, to }                                 date range of the current list
shoppingItems/{id}     { name, amounts: Amount[], sectionId, checked, manual, sources[] }
```

### Security model

- Firebase Auth with Google is the only sign-in method.
- Firestore rules: a user may read/write app data only if `request.auth.token.email_verified` and `members/{email}` exists. Users may read only their own `members` doc (so the app can show "not authorized"). Nobody can write `members` from the client.
- Member emails live in Firestore (added via console), never in this public repo.
- Optional hardening (manual): after both members have signed in once, disable new sign-ups in Firebase Auth settings; restrict the browser API key to the hosting domains.
- Firebase web config (API key etc.) is public by design; it is injected at build time from GitHub repository variables.

### Auth flow

- Production (`location.host === authDomain`, i.e. `<project>.web.app`): `signInWithRedirect` — same-origin, so it works inside installed iOS/Android PWAs and with third-party storage blocking.
- Elsewhere (localhost dev): `signInWithPopup`.
- The service worker's navigation fallback excludes `/__/` so Firebase's `/__/auth/handler` is never shadowed.

## Manual setup (you)

These need your Google/GitHub accounts; full step-by-step instructions are in `README.md`.

1. Create a Firebase project (Spark plan), add a Web app, note the config.
2. Authentication → enable Google provider.
3. Firestore → create database (production mode, e.g. `europe-west1`).
4. Add documents `members/<your-email>` and `members/<partner-email>`.
5. Google Cloud → OAuth client → add redirect URI `https://<project>.web.app/__/auth/handler`.
6. Create a deploy service account + JSON key → GitHub secret `FIREBASE_SERVICE_ACCOUNT`.
7. GitHub repository variables: `VITE_FIREBASE_*` config values.

## Todo

- [x] 1. Scaffold Vite+ React-TS app in repo root; configure `vite.config.ts` (lint/fmt/test), `.gitignore`
- [x] 2. Add dependencies: firebase, react-router, motion, vite-plugin-pwa
- [x] 3. Design tokens (light/dark), global styles, UI primitives, icons
- [x] 4. App shell: routing, bottom tab bar / desktop sidebar, page transitions
- [x] 5. Firebase init (env config, offline cache, emulators), `firebase.json`, `firestore.rules`
- [x] 6. Auth: Google sign-in (redirect/popup), members check, sign-in + not-allowed pages, sign out
- [x] 7. Recipes: list with search + tag filter, create/edit/delete, ingredient autocomplete
- [x] 8. Planner: 14-day cards, meal sheet (recipes, servings, note, leftovers), desktop grid
- [x] 9. Settings: store sections editor (add/rename/delete/drag-reorder), account, install entry
- [x] 10. Shopping: generate from date range (scale, merge, sections), check off → In cart, manual items, move item to section, clear/regenerate
- [x] 11. PWA: manifest, icons, service worker, install popup (Android/desktop prompt, iOS instructions)
- [x] 12. Unit tests: units, dates, buildList
- [x] 13. GitHub Actions: check, test, build, deploy hosting + rules on push to `main`
- [x] 14. `CLAUDE.md` + `README.md` setup guide
- [x] 15. Verify locally against Firebase emulators (mobile + desktop, light + dark)
- [x] 16. Quality review and fixes

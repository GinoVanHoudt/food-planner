# Food Planner

Mobile-first PWA for two people to plan lunch and dinner for the next 14 days, manage recipes, keep
an inventory of what is at home, and turn the plan into a shared shopping list (minus what is at
home) that is checked off in the store, with the store loyalty cards at hand as QR codes or barcodes.
Bought items are put away into the inventory; marking a meal cooked takes its ingredients out.
`PLAN.md` holds the original plan and decisions; `README.md` the setup and deploy steps.

## Stack

- Vite+ (`vp`) toolchain, React 19 + TypeScript, React Router 8 (data router, `react-router` /
  `react-router/dom`).
- Firebase: Auth (Google only) + Cloud Firestore with the persistent offline cache. No backend code.
- Hosting: Firebase Hosting, deployed by `.github/workflows/deploy.yml` on every push to `main`.
- `motion` (`motion/react`) for animations, `lucide-react` for icons, `vite-plugin-pwa` for the
  manifest, icons (generated from `public/logo.svg`; the browser favicon is the plain cup in
  `public/favicon.svg`) and Workbox service worker.
- `uqr` encodes QR codes; EAN-13 barcodes are encoded in `cards/barcode.ts`.

## Commands

| Task                         | Command                                                |
| ---------------------------- | ------------------------------------------------------ |
| Install                      | `vp install`                                           |
| Dev server (real project)    | `vp dev` (needs `.env.local`, see README)              |
| Local emulators (needs Java) | `vp run emulators`, then `vp run seed you@example.com` |
| Dev server against emulators | `vp run dev:emulators` (`vp dev --mode emulator`)      |
| Format + lint + type-check   | `vp check` (`vp check --fix` to format)                |
| Unit tests                   | `vp test`                                              |
| Production build             | `vp build`                                             |

Always finish with `vp check` and `vp test`; CI runs both before deploying.

The project is small and simple enough to skip branches and PRs: when asked to commit and push,
commit straight to `main` and push it (which deploys).

## Layout

```
src/
├─ app/        Root (auth gate + global overlays), router, AppShell (nav + page transitions)
├─ features/   one folder per feature: auth, planner, recipes, shopping, inventory, cards, settings, ingredients, pwa
├─ lib/        firebase init, live Firestore stores, dates, units, small hooks
├─ ui/         shared presentational components (Button, Sheet, Stepper, Chip, Field, Page…)
└─ styles/     tokens.css (all colours/spacing, light + dark) and global.css
```

## Conventions

- **Data access**: each feature has one data module (`recipes/recipes.ts`, `planner/plan.ts`,
  `shopping/shopping.ts`, `inventory/inventory.ts`, `cards/cards.ts`, `settings/sections.ts`,
  `settings/locations.ts`, `ingredients/catalog.ts`) with a `liveCollection` / `liveDocument` store
  (`lib/live.ts`), a `use…()` hook and write functions. Components never call Firestore directly.
  Writes that touch the inventory together with another collection go in one batch
  (`addStockChanges`).
- **Writes are fire-and-forget**: wrap them in `persist()` (`lib/persist.ts`) and never await them in
  the UI. Offline writes only resolve once back online, but the local cache updates immediately.
  Create ids client-side with `doc(collection(...))` instead of `addDoc`.
- **Pure logic stays Firebase-free** so it can be unit-tested: `lib/dates.ts`, `lib/units.ts`,
  `lib/group.ts`, `lib/list.ts`, `planner/types.ts`, `shopping/buildList.ts`, `inventory/stock.ts`,
  `cards/barcode.ts`, `recipes/input.ts`, `recipes/filter.ts`, `ingredients/lookup.ts`,
  `pwa/platform.ts`, `auth/errors.ts`. Use `import type` for types from data modules. Logic in
  components and hooks goes in these modules (with a `*.test.ts` next to them), so the components
  only wire state to it.
- **Inventory** items are keyed by `ingredientKey`, like the catalog, so they match recipe
  ingredients by name. Amounts are only subtracted within the same unit (after g/ml conversion); an
  item without amounts means "we have some" and covers any need, and `always` items are never on a
  list or used up. Items whose catalog entry is a `meal` (a frozen soup, leftovers) can be planned
  as lunch or dinner (`Slot.fromInventory`); cooking takes them out whole. `expires` is optional
  and merging keeps the earliest date; leave out empty dates (Firestore rejects `undefined`,
  see `expiresField`).
- **Names** of recipes, ingredients and shopping/inventory items are saved in lower case with
  `cleanName` (`lib/units.ts`), because phones capitalise the first letter and computers don't, and
  shown with `capitalize`. Their inputs set `autoCapitalize="off"`. Tags are lower case too.
- **Dates** are local-time `DayKey` strings (`YYYY-MM-DD`); compare them as strings.
- **Quantities** are stored per recipe servings and scaled when planned; metric units are summed in
  base units (g/ml) and formatted back (`formatAmount`).
- **Styling**: CSS Modules next to the component, colours and spacing only via the variables in
  `styles/tokens.css` (they switch with `data-theme` on `<html>`: the system scheme by default, or
  the per-device choice in Settings, see `settings/useTheme.ts`). Mobile first; the desktop layout
  starts at `min-width: 900px` (`DESKTOP_QUERY`). Inputs use a 16px font so iOS does not zoom.
- **Modals** use `ui/Sheet` (bottom sheet on mobile, dialog on desktop). Keep animations short and
  subtle; `MotionConfig reducedMotion="user"` is set at the root.
- Import from `vite-plus` / `vite-plus/test`, not `vite` / `vitest` (lint rule).

## Security model

- Access = a Firestore document `members/{lowercased email}` exists and the email is verified.
  Members are added by hand in the Firebase console; never commit member emails, and keep loyalty
  card numbers in Firestore rather than in the code (the bundle is public).
- `firestore.rules` is the only access control. Update it whenever a collection or field is added
  (it validates shapes per collection) — it deploys together with hosting.
- Sign-in uses `signInWithRedirect` when the app runs on its auth domain (`<project>.web.app`, so it
  works inside installed iOS PWAs) and `signInWithPopup` elsewhere (localhost). The service worker's
  navigation fallback must keep excluding `/__/` (Firebase's auth handler).

## Firestore data

```
members/{email}        { name }                                          console-managed allowlist
recipes/{id}           { name, servings, ingredients[{name, quantity|null, unit}], instructions, sourceUrl, tags[] }
plan/{YYYY-MM-DD}      { lunch?: Slot, dinner?: Slot }
                       Slot = { recipes[{recipeId, servings}], fromInventory?[name], note, cooked?,
                                taken?[{name, amounts[], expires?}] }
ingredients/{key}      { name, sectionId?, locationId?, meal? }          remembered store section, home location, full meal
inventory/{key}        { name, amounts[], always, expires? }             what is at home, key = ingredientKey
settings/sections      { sections[{id, name}] }                          store walking order
settings/locations     { locations[{id, name}] }                         inventory locations (fridge, freezer…)
settings/shopping      { from, to }                                      range of the current list
shoppingItems/{id}     { name, amounts[], sectionId, checked, manual, sources[] }
cards/{id}             { name, format: 'qr'|'ean13', value }             store loyalty cards
```

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

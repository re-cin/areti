# areti

A smart study planner with Pomodoro focus sessions and a ghost companion.
**Status:** beta, offline-first (everything works on the device; cloud sync comes later, if time allows).

- **Planner:** builds an exam study plan from subjects, free hours and the exam date, and assigns Pomodoro blocks.
- **Pomodoro:** runs the planned sessions (also works in the background and notifies when done).
- **Statistics:** focus time, sessions, heatmap, time per subject.
- **Reti (the ghost):** XP, levels and unlockable expressions. Built last.

## Quick start

You need: **Node.js LTS** (22 or newer), **Git**, and a phone or emulator.

```bash
git clone <repo-url>
cd areti
npm install
npx expo start
```

Everyone must use the same Expo SDK. It is pinned by `package.json` and `package-lock.json`.
Always install Expo-related packages with `npx expo install <package>` (not `npm install`),
so the SDK-compatible version is chosen. Never upgrade packages during the build month without telling the team.

### Expo Go or a development build?

This project is on **Expo SDK 58**. Each Expo Go build supports exactly one SDK, so check that
the Expo Go app on your phone supports SDK 58 (the app shows an "incompatible" error otherwise).
If it does not, use a **development build** (your own copy of the app, which also behaves like the real app):

```bash
npx expo run:android      # needs Android Studio (Android SDK) installed
npx expo run:ios          # Mac only, needs Xcode
```

or build in the cloud with EAS (`npx eas-cli build --profile development`, needs an Expo account and an `eas.json`;
run `npx eas-cli build:configure` once). Windows machines cannot build iOS locally; the Mac teammate or EAS can.

Expo Go is fine for most screens. **Test the timer, notifications and background behavior on a real build**,
because Expo Go does not behave exactly like the shipped app.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the dev server |
| `npm run android` / `npm run ios` | Start and open on a device or emulator |
| `npm run typecheck` | TypeScript check. Run before every pull request |
| `npm test` | Unit tests (Jest) |
| `npm run lint` | Lint |
| `npm run db:generate` | Generate a database migration after editing `src/db/schema.ts` |
| `npx expo-doctor` | Diagnose dependency and config problems |

## Tech stack

Expo SDK 58, React Native, TypeScript, Expo Router (file-based navigation), `expo-sqlite` + Drizzle ORM (local database),
Zustand (app state), `expo-notifications` (local notifications only), `react-native-svg` + `react-native-reanimated` (ghost),
Fredoka via `@expo-google-fonts/fredoka`, Jest.

## Project structure

```
src/
  app/                  Screens. Every file is a route (Expo Router)
    (tabs)/             planner, pomodoro, statistics, reti
    onboarding/         welcome + 4 intro screens
    settings/           settings screens
  components/ui/        Text, NeoBox, NeoButton, Pill ... shared building blocks
  theme/                colors, fonts, spacing, radii, borders (design tokens)
  db/                   schema, client, ids. Queries live here too
  features/
    planner/            engine + rules (pure TypeScript, tested)
    timer/              timer math and notification scheduling
    stats/  pet/        (to build)
  stores/               Zustand stores
drizzle/                Generated migrations (commit these, never edit shipped ones)
design/                 Exported assets (icon, logo, ghost). Figma stays in Figma
docs/                   Planner rules, decisions
```

Imports use the `@/` alias (`@/theme`, `@/components/ui/Text`).

## Conventions (please read)

1. **No hard-coded colors, sizes or fonts in screens.** Use `@/theme`. Dark mode will be added by changing tokens.
2. **Fonts: Fredoka Regular, Medium, SemiBold only. No bold.** Never use `fontWeight`; use `<Text variant="...">`.
3. **Cards and buttons use `NeoBox` / `NeoButton`.** Android cannot draw hard shadows with `elevation`, so the shadow is a second view. Do not use `shadow*` or `elevation` props.
4. **Logic stays in plain TypeScript** (`features/*`), with no Expo or React Native imports, so it is testable and portable. Screens only display it.
5. **Do not call the database from screens.** Put queries in `src/db` and call them from there.
6. **Database rules:** ids are UUIDs made on the device (`newId()`), never auto-increment; set `updatedAt` on every write; delete by setting `deletedAt`. After changing the schema run `npm run db:generate` and commit the new files in `drizzle/`.
7. **The timer never counts seconds with `setInterval`.** It stores `endsAt` and computes the remaining time from the clock (see `features/timer/timerMath.ts`), and schedules a local notification for `endsAt`.
8. **No secrets in the repo.** `.env` is ignored. Never put a Supabase `service_role` key in this project.
9. **Build to the Figma file** (thickness, sizes). Ask the designer if something is unclear.

## Git workflow

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: never commit to `main`, one branch per task, pull request with one approval, `npm run typecheck && npm test` first.

## Planner rules

See [docs/planner-rules.md](docs/planner-rules.md). It lists the agreed rules and the open questions.

## Plan (one month)

1. **Week 1:** foundation (this scaffold), components from Figma, navigation, database, planner engine started.
2. **Week 2:** timer + notifications, planner engine finished, planner screen + edit mode, onboarding.
3. **Week 3:** statistics, settings, subject management, regenerate prompt.
4. **Week 4:** Reti (ghost) tab, polish against Figma, beta builds and bug round. Cloud sync (Supabase) only if we are ahead.

## Troubleshooting

- **"Project is incompatible with this version of Expo Go":** your Expo Go does not support SDK 58. Use a development build (see above).
- **Weird errors after pulling:** `npm install`, then `npx expo start -c` (clears the cache).
- **Package version warnings:** `npx expo install --fix`.
- **`.sql` import errors:** `metro.config.js` and `babel.config.js` must keep the Drizzle settings.
- **Database changed but app crashes on start:** you forgot `npm run db:generate`, or someone edited an old migration.

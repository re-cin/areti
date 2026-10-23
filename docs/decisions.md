# Decisions

- **One repo (`areti`)** for app, design exports and docs. Backend (Supabase) is optional and comes later.
- **Offline-first.** The local SQLite database is the source of truth. Cloud sync is an optional extra.
- **No sign-in in the beta.** No Google/Apple login yet. Beta testers only, no store release.
- **Expo Router + TypeScript + Drizzle.**
- **Timer uses timestamps and local notifications**, with a user setting to keep it running in the background (default on).
- **Ghost animation (floating, blinking, hem fluttering)** with `react-native-svg` + `react-native-reanimated`, built last.
- **Fonts:** Fredoka Regular, Medium, SemiBold only.

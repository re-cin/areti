# Decisions

- **One repo (`areti`)** for app, design exports and docs. Backend (Supabase) is optional and comes later.
- **Offline-first.** The local SQLite database is the source of truth. Cloud sync is an optional extra.
- **No sign-in in the beta.** No Google/Apple login yet. Beta testers only, no store release.
- **Expo Router + TypeScript + Drizzle.**
- **Timer uses timestamps and local notifications**, with a user setting to keep it running in the background (default on).
- **Ghost animation (floating, blinking, hem fluttering)** with `react-native-svg` + `react-native-reanimated`, built last.
- **Fonts:** Fredoka Regular, Medium, SemiBold only.
- **Accounts and cloud sync use Supabase** (project "roakariri's Project" in the `areti` org). Sign in is Supabase Auth (email + password), so accounts work on any phone. The phone's SQLite database is still the source of truth and works offline; `src/sync/sync.ts` uploads and downloads changes (newest `updatedAt` wins, server stamps `server_updated_at` for downloads). Cloud schema: `supabase/migrations/`. Each user can only see their own rows (row level security). Put the project URL and publishable key in `.env` (see `.env.example`); `.env` is not committed.

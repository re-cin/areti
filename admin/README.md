# areti admin (website only)

A separate web app for areti admins: a **Dashboard** and a **Users** list with each
user's **subscription**. It is a plain website (Vite + React), not part of the Expo
app, so it is never bundled into the phone app and can only be opened in a browser.
It uses the same look as the app (cream, ink outlines, hard shadows, Fredoka) and reads
its colors straight from `../src/theme/colors.ts`.

## Run it

```bash
cd admin
npm install
npm run dev        # http://localhost:5174
```

With no `admin/.env` the site opens in **demo mode** with sample data.

## Connect it to Supabase

1. Apply the migration `supabase/migrations/20261123120000_admin_and_subscriptions.sql`
   (Supabase dashboard → SQL editor, or `supabase db push`).
2. Make yourself an admin (SQL editor):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
3. Copy `admin/.env.example` to `admin/.env` and fill in the same URL and anon key the app uses.
4. `npm run dev` and sign in with that account. Non-admin accounts are signed out straight away.

## How subscriptions work

- `public.subscriptions` has one row per user: `plan` (`free` | `premium`), `status`
  (`active` | `trialing` | `canceled` | `expired`) and `current_period_end`. No row means Free.
- A user counts as Premium only while the plan is `premium` and the status is `active` or `trialing`.
- Users can read their own row (so the app can show PRO later); only admins can change it,
  through `admin_set_subscription`. The Users page's **Subscription** button calls it.
- Everything the site reads goes through `admin_dashboard_stats`, `admin_list_users` and
  `is_admin`. They are `security definer` and refuse anyone not in `public.admins`.

## Deploy

`npm run build` makes a static site in `admin/dist`. Host it anywhere static (Vercel,
Netlify, Cloudflare Pages). Add a rewrite of all paths to `/index.html` so `/users` works
on refresh, and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in the host's env settings.

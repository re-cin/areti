-- The difficulty column was removed from public.subjects outside of migrations, but every
-- version of the app still has it (src/db/schema.ts) and uploads it, so subject sync failed
-- with PGRST204 "Could not find the 'difficulty' column". Put it back as originally defined.
-- Don't change cloud tables by hand in the dashboard: add a migration here instead, and keep
-- src/db/schema.ts (the phone's tables) and these cloud tables in step.
alter table public.subjects add column if not exists difficulty integer not null default 3;

-- Make the API notice the column right away.
notify pgrst, 'reload schema';

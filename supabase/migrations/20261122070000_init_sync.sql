-- areti cloud schema: a copy of the on-device SQLite tables, one set of rows per user.
--
-- How sync works (see src/sync/sync.ts):
--  * Phones upload changed rows (upsert by id). The trigger below keeps whichever version
--    has the newest updated_at, so an older edit can never overwrite a newer one.
--  * The server stamps every insert/update with server_updated_at (its own clock).
--    Phones download "rows with server_updated_at after my last download", so edits made
--    offline (with old timestamps) are still picked up by other phones.
--  * Deletes are soft (deleted_at), exactly like on the phone.
--  * Row level security: each signed-in user can only read and write their own rows.

-- ---------------------------------------------------------------------------
-- Shared trigger: newest edit wins + server timestamp
-- ---------------------------------------------------------------------------
create or replace function public.areti_sync_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Older (or the same) edit arriving: keep the row as it is.
    if new.updated_at <= old.updated_at then
      return null;
    end if;
    -- Rows never move to another user.
    new.user_id := old.user_id;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables (columns match src/db/schema.ts; epoch-ms times are bigint)
-- ---------------------------------------------------------------------------
create table public.subjects (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  name text not null,
  color text not null,
  difficulty integer not null default 3,
  urgency integer not null default 3,
  sort_order integer not null default 0
);

create table public.study_plans (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  subject_id text not null,
  exam_date bigint not null,
  status text not null default 'active'
);

create table public.planned_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  plan_id text not null,
  subject_id text not null,
  date bigint not null,
  start_minute integer,
  blocks integer not null,
  locked boolean not null default false,
  excluded boolean not null default false,
  completed_blocks integer not null default 0
);

create table public.focus_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  subject_id text,
  planned_session_id text,
  started_at bigint not null,
  duration_sec integer not null,
  completed boolean not null default false
);

create table public.ghost_state (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  name text not null default 'Reti',
  level integer not null default 1,
  xp integer not null default 0,
  equipped_expression text not null default 'neutral',
  unlocked_expressions text not null default '["neutral"]'
);

create table public.tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  title text not null,
  subject_id text not null,
  date bigint not null,
  start_minute integer not null,
  end_minute integer not null,
  done boolean not null default false,
  source text not null default 'manual',
  plan_id text,
  movable boolean not null default false,
  has_pomodoro boolean not null default false,
  notification_sound text not null default 'Silent'
);

create table public.profile (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  display_name text not null default '',
  picture_uri text
);

-- Settings are key/value per user (the phone's settings table has key as its primary key).
create table public.settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at bigint not null,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, key)
);

-- ---------------------------------------------------------------------------
-- Trigger, index and row level security for every table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'subjects', 'study_plans', 'planned_sessions', 'focus_sessions',
    'ghost_state', 'tasks', 'profile', 'settings'
  ]
  loop
    execute format(
      'create trigger areti_sync_row before insert or update on public.%I
         for each row execute function public.areti_sync_row()', t);
    execute format(
      'create index %I on public.%I (user_id, server_updated_at)', t || '_user_server_updated_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Users manage their own rows" on public.%I
         for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

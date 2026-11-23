-- Admin website support: who is an admin, each user's subscription, and the
-- read/write functions the admin site (admin/) calls.
--
-- Security model
--  * public.admins lists the accounts allowed into the admin site. It has row level
--    security on and NO policies, so the app and the site can never read or change it
--    directly. Add an admin from the Supabase SQL editor:
--        insert into public.admins (user_id)
--        select id from auth.users where email = 'you@example.com';
--  * Every admin_* function is "security definer" and starts by checking is_admin(),
--    so a normal signed-in user calling them only gets an error.
--  * public.subscriptions: a user can read their own row (so the app can show PRO later),
--    but only admins (through admin_set_subscription) can change it.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Subscriptions (one row per user; no row = Free)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'canceled', 'expired')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

drop policy if exists "Users read their own subscription" on public.subscriptions;
create policy "Users read their own subscription" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins manage subscriptions" on public.subscriptions;
create policy "Admins manage subscriptions" on public.subscriptions
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Dashboard numbers
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats(p_days integer default 14)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);
  week_ms bigint := (extract(epoch from now() - interval '7 days') * 1000)::bigint;
  result json;
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;

  select json_build_object(
    'total_users', (select count(*) from auth.users),
    'new_users_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'active_users_7d', (
      select count(distinct user_id) from public.focus_sessions
      where deleted_at is null and started_at >= week_ms),
    'premium_users', (
      select count(*) from public.subscriptions
      where plan = 'premium' and status in ('active', 'trialing')),
    'focus_minutes_total', (
      select coalesce(sum(duration_sec), 0) / 60 from public.focus_sessions where deleted_at is null),
    'focus_minutes_7d', (
      select coalesce(sum(duration_sec), 0) / 60 from public.focus_sessions
      where deleted_at is null and started_at >= week_ms),
    'sessions_completed_7d', (
      select count(*) from public.focus_sessions
      where deleted_at is null and completed and started_at >= week_ms),
    'plans', (
      select json_build_object(
        'free', count(*) filter (where coalesce(s.plan, 'free') = 'free'
                                  or s.status not in ('active', 'trialing')),
        'premium', count(*) filter (where s.plan = 'premium' and s.status in ('active', 'trialing')))
      from auth.users u left join public.subscriptions s on s.user_id = u.id),
    'daily', (
      select json_agg(json_build_object('day', d.day, 'signups', d.signups, 'focus_minutes', d.focus_minutes)
                      order by d.day)
      from (
        select g.day::date as day,
          (select count(*) from auth.users u
             where u.created_at >= g.day and u.created_at < g.day + interval '1 day') as signups,
          (select coalesce(sum(f.duration_sec), 0) / 60 from public.focus_sessions f
             where f.deleted_at is null
               and f.started_at >= (extract(epoch from g.day) * 1000)::bigint
               and f.started_at < (extract(epoch from g.day + interval '1 day') * 1000)::bigint) as focus_minutes
        from generate_series(since, date_trunc('day', now()), interval '1 day') as g(day)
      ) d),
    'recent_signups', (
      select coalesce(json_agg(r order by r.created_at desc), '[]'::json)
      from (
        select u.id, u.email, u.created_at, p.display_name
        from auth.users u
        left join public.profile p on p.user_id = u.id and p.deleted_at is null
        order by u.created_at desc
        limit 5
      ) r)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Users list (with subscription)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  picture_uri text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  plan text,
  subscription_status text,
  current_period_end timestamptz,
  focus_minutes bigint,
  sessions_count bigint,
  last_focus_at bigint,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    p.picture_uri,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at is not null,
    coalesce(s.plan, 'free'),
    coalesce(s.status, 'active'),
    s.current_period_end,
    coalesce(f.minutes, 0)::bigint,
    coalesce(f.sessions, 0)::bigint,
    f.last_at,
    exists (select 1 from public.admins a where a.user_id = u.id)
  from auth.users u
  left join lateral (
    select pr.display_name, pr.picture_uri from public.profile pr
    where pr.user_id = u.id and pr.deleted_at is null
    order by pr.updated_at desc limit 1
  ) p on true
  left join public.subscriptions s on s.user_id = u.id
  left join lateral (
    select sum(fs.duration_sec) / 60 as minutes, count(*) as sessions, max(fs.started_at) as last_at
    from public.focus_sessions fs
    where fs.user_id = u.id and fs.deleted_at is null
  ) f on true
  order by u.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Change a user's subscription
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_subscription(
  p_user_id uuid,
  p_plan text,
  p_status text default 'active',
  p_current_period_end timestamptz default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.subscriptions;
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;

  insert into public.subscriptions as s (user_id, plan, status, current_period_end, started_at, updated_at)
  values (p_user_id, p_plan, p_status, p_current_period_end, now(), now())
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        -- A new premium period starts when someone moves from free to premium.
        started_at = case when s.plan <> excluded.plan then now() else s.started_at end,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.admin_dashboard_stats(integer) from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_set_subscription(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.admin_dashboard_stats(integer) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_subscription(uuid, text, text, timestamptz) to authenticated;

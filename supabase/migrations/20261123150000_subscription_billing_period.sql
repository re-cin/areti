-- Subscriptions now have a billing period: weekly, monthly or yearly (empty for Free).
-- The admin site sets it together with the plan, status and due date.
-- Safe to run more than once.

alter table public.subscriptions
  add column if not exists billing_period text
  check (billing_period in ('weekly', 'monthly', 'yearly'));

-- ---------------------------------------------------------------------------
-- Change a user's subscription (now with the billing period; old 4-argument version removed)
-- ---------------------------------------------------------------------------
drop function if exists public.admin_set_subscription(uuid, text, text, timestamptz);

create or replace function public.admin_set_subscription(
  p_user_id uuid,
  p_plan text,
  p_status text default 'active',
  p_current_period_end timestamptz default null,
  p_billing_period text default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.subscriptions;
  v_period text := case when p_plan = 'premium' then p_billing_period else null end;
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;

  insert into public.subscriptions as s (user_id, plan, status, billing_period, current_period_end, started_at, updated_at)
  values (p_user_id, p_plan, p_status, v_period, p_current_period_end, now(), now())
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        billing_period = excluded.billing_period,
        current_period_end = excluded.current_period_end,
        started_at = case when s.plan <> excluded.plan then now() else s.started_at end,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.admin_set_subscription(uuid, text, text, timestamptz, text) from public, anon;
grant execute on function public.admin_set_subscription(uuid, text, text, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Users list and user page, now with billing_period
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_users();

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
  billing_period text,
  current_period_end timestamptz,
  focus_minutes bigint,
  sessions_count bigint,
  last_focus_at bigint,
  is_admin boolean,
  disabled boolean
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
    s.billing_period,
    s.current_period_end,
    coalesce(f.minutes, 0)::bigint,
    coalesce(f.sessions, 0)::bigint,
    f.last_at,
    exists (select 1 from public.admins a where a.user_id = u.id),
    coalesce(u.banned_until > now(), false)
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

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_user_detail(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result json;
  today_ms bigint := (extract(epoch from date_trunc('day', now())) * 1000)::bigint;
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    return null;
  end if;

  select json_build_object(
    'user', (
      select json_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed', u.email_confirmed_at is not null,
        'disabled', coalesce(u.banned_until > now(), false),
        'display_name', p.display_name,
        'picture_uri', p.picture_uri,
        'is_admin', exists (select 1 from public.admins a where a.user_id = u.id))
      from auth.users u
      left join lateral (
        select pr.display_name, pr.picture_uri from public.profile pr
        where pr.user_id = u.id and pr.deleted_at is null
        order by pr.updated_at desc limit 1
      ) p on true
      where u.id = p_user_id),
    'subscription', (
      select json_build_object(
        'plan', coalesce(s.plan, 'free'),
        'status', coalesce(s.status, 'active'),
        'billing_period', s.billing_period,
        'started_at', s.started_at,
        'current_period_end', s.current_period_end)
      from (select 1) x
      left join public.subscriptions s on s.user_id = p_user_id),
    'ghost', (
      select json_build_object('name', g.name, 'level', g.level, 'xp', g.xp)
      from public.ghost_state g
      where g.user_id = p_user_id and g.deleted_at is null
      order by g.updated_at desc limit 1),
    'subjects', (
      select coalesce(json_agg(json_build_object(
        'id', sb.id, 'name', sb.name, 'color', sb.color, 'deleted', sb.deleted_at is not null)
        order by sb.sort_order), '[]'::json)
      from public.subjects sb
      where sb.user_id = p_user_id),
    'sessions', (
      select coalesce(json_agg(json_build_object(
        'started_at', f.started_at,
        'duration_sec', f.duration_sec,
        'completed', f.completed,
        'subject_id', f.subject_id)
        order by f.started_at), '[]'::json)
      from public.focus_sessions f
      where f.user_id = p_user_id and f.deleted_at is null),
    'tasks', (
      select json_build_object(
        'total', count(*),
        'done', count(*) filter (where t.done),
        'overdue', count(*) filter (where not t.done and t.date < today_ms))
      from public.tasks t
      where t.user_id = p_user_id and t.deleted_at is null),
    'exams', (
      select coalesce(json_agg(json_build_object(
        'subject_id', sp.subject_id,
        'exam_date', sp.exam_date,
        'status', sp.status)
        order by sp.exam_date), '[]'::json)
      from public.study_plans sp
      where sp.user_id = p_user_id and sp.deleted_at is null)
  ) into result;

  return result;
end;
$$;

notify pgrst, 'reload schema';

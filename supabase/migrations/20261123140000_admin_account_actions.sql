-- Admin website: account controls on a user's page.
--  * admin_set_admin(user, true/false)    give or take away admin access
--  * admin_set_disabled(user, true/false) disable (ban) or re-enable an account
--  * admin_delete_user(user)              permanently delete an account and all its data
-- Disabling uses Supabase Auth's own ban (auth.users.banned_until) and signs the user out
-- of every device, so they cannot sign in or refresh their session. A token they already
-- hold keeps working until it expires (about an hour).
-- Admins can never disable, delete or remove admin access from their own account.
-- Also adds a "disabled" flag to admin_list_users and admin_user_detail.
-- Admins only. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Users list, now with "disabled" (the return type changes, so drop it first)
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

-- ---------------------------------------------------------------------------
-- One user's stats, now with "disabled"
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Admin access
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_admin(p_user_id uuid, p_make_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User not found';
  end if;

  if p_make_admin then
    insert into public.admins (user_id) values (p_user_id) on conflict (user_id) do nothing;
  else
    if p_user_id = auth.uid() then
      raise exception 'You cannot remove your own admin access';
    end if;
    delete from public.admins where user_id = p_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Disable / enable
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_disabled(p_user_id uuid, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot disable your own account';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User not found';
  end if;

  if p_disabled then
    update auth.users set banned_until = now() + interval '100 years' where id = p_user_id;
    -- Sign them out everywhere: their refresh tokens stop working.
    delete from auth.sessions where user_id = p_user_id;
  else
    update auth.users set banned_until = null where id = p_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete (permanent). Every app table references auth.users with "on delete cascade",
-- so this also removes their subjects, sessions, tasks, plans, profile, subscription.
-- The admin site removes their profile picture file first.
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account here';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke execute on function public.admin_set_admin(uuid, boolean) from public, anon;
revoke execute on function public.admin_set_disabled(uuid, boolean) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_set_disabled(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Let admins remove someone's profile picture file (avatars/<user id>/...) when deleting them.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins read avatar files" on storage.objects;
create policy "Admins read avatar files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (select public.is_admin()));

drop policy if exists "Admins delete avatar files" on storage.objects;
create policy "Admins delete avatar files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (select public.is_admin()));

-- Let the API see the changes straight away.
notify pgrst, 'reload schema';

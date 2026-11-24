-- Admin website: the Reti page.
--  * admin_reti_detail: one user's ghost row, daily goal and focus log. The site works out level, EXP,
--    streak and momentum from the log with the app's own pet code (src/features/pet), so it always
--    matches the phone.
--  * admin_add_test_focus / admin_remove_test_focus: test tools. They add or remove focus-log rows marked
--    planned_session_id = 'dev-test', exactly like real study, so the phone's Reti, Pomodoro and
--    Statistics react at the next sync. Removing only touches those test rows; real study is never changed.
--    Test tools work only on ADMIN accounts (listed in public.admins): normal users' pets are never changed.
-- Admins only (is_admin() from 20261123120000_admin_and_subscriptions.sql). Safe to run more than once.

create or replace function public.admin_reti_detail(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    return null;
  end if;
  return json_build_object(
    'ghost', (
      select json_build_object('name', g.name, 'level', g.level, 'xp', g.xp, 'updated_at', g.updated_at)
      from public.ghost_state g
      where g.user_id = p_user_id and g.deleted_at is null
      order by g.updated_at desc limit 1),
    'daily_goal', (
      select s.value from public.settings s
      where s.user_id = p_user_id and s.key = 'pet.dailyGoalMinutes'),
    'sessions', (
      select coalesce(json_agg(json_build_object(
        'started_at', f.started_at,
        'duration_sec', f.duration_sec,
        'completed', f.completed,
        'test', f.planned_session_id = 'dev-test')
        order by f.started_at), '[]'::json)
      from public.focus_sessions f
      where f.user_id = p_user_id and f.deleted_at is null));
end;
$$;

create or replace function public.admin_add_test_focus(
  p_user_id uuid, p_started_at bigint, p_duration_sec integer, p_completed boolean)
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
    raise exception 'No such user';
  end if;
  if not exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'Test tools only work on admin accounts' using errcode = '42501';
  end if;
  if p_duration_sec < 1 or p_duration_sec > 36000 then
    raise exception 'A test block must be between 1 second and 10 hours';
  end if;
  insert into public.focus_sessions (id, user_id, updated_at, subject_id, planned_session_id, started_at, duration_sec, completed)
  values (gen_random_uuid()::text, p_user_id, (extract(epoch from clock_timestamp()) * 1000)::bigint,
          null, 'dev-test', p_started_at, p_duration_sec, p_completed);
end;
$$;

create or replace function public.admin_remove_test_focus(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  removed integer;
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;
  if not exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'Test tools only work on admin accounts' using errcode = '42501';
  end if;
  -- Soft delete (deleted_at), the same way the app deletes, so the removal syncs to the phone.
  update public.focus_sessions
     set deleted_at = now_ms, updated_at = greatest(now_ms, updated_at + 1)
   where user_id = p_user_id and planned_session_id = 'dev-test' and deleted_at is null;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.admin_reti_detail(uuid) from public, anon;
revoke execute on function public.admin_add_test_focus(uuid, bigint, integer, boolean) from public, anon;
revoke execute on function public.admin_remove_test_focus(uuid) from public, anon;
grant execute on function public.admin_reti_detail(uuid) to authenticated;
grant execute on function public.admin_add_test_focus(uuid, bigint, integer, boolean) to authenticated;
grant execute on function public.admin_remove_test_focus(uuid) to authenticated;

-- Let the API see the new functions straight away.
notify pgrst, 'reload schema';

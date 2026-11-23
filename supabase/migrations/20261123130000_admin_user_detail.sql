-- Admin website: one user's own statistics (the Users → user page).
-- Returns their profile, subscription, pet, subjects, every focus session, task counts
-- and exams. The site works out streaks and charts from the sessions in the admin's
-- browser, the same way the phone app's Statistics tab does.
-- Admins only (see 20261123120000_admin_and_subscriptions.sql). Safe to run more than once.

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

revoke execute on function public.admin_user_detail(uuid) from public, anon;
grant execute on function public.admin_user_detail(uuid) to authenticated;

-- Let the API see the new function straight away.
notify pgrst, 'reload schema';

-- Free students may generate (or regenerate) a study schedule a few times per calendar month.
-- The count lives on the server, per account, so reinstalling or clearing the app cannot reset it.
--
--  * public.schedule_generations holds one row per user per month (period = first day of the UTC month).
--    Students can READ their own rows but can never write them: there is deliberately no
--    insert/update/delete policy. The count only changes through consume_schedule_generation().
--  * Premium students are never counted. Missing subscription rows are Free (see public.is_premium).
--  * The monthly limit (3) must match FREE_MONTHLY_GENERATIONS in src/features/subscription/entitlements.ts.
--  * The month starts and ends at 00:00 UTC, the same for every student.

create table public.schedule_generations (
  user_id uuid not null references auth.users (id) on delete cascade,
  period date not null,
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.schedule_generations enable row level security;

create policy "Users read their own schedule generations" on public.schedule_generations
  for select to authenticated
  using (user_id = (select auth.uid()));

-- What the app shows: this month's usage, or premium = true (no limit).
create or replace function public.schedule_generation_usage()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_premium(auth.uid()) then jsonb_build_object('premium', true)
    else jsonb_build_object(
      'premium', false,
      'limit', 3,
      'used', coalesce((
        select g.used from public.schedule_generations g
        where g.user_id = auth.uid()
          and g.period = (date_trunc('month', now() at time zone 'utc'))::date
      ), 0),
      'resets_at', (date_trunc('month', now() at time zone 'utc') + interval '1 month') at time zone 'utc'
    )
  end;
$$;

-- Uses one generation. allowed = false (with the month's usage) once the Free limit is reached.
create or replace function public.consume_schedule_generation()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  free_limit constant integer := 3;
  this_month date := (date_trunc('month', now() at time zone 'utc'))::date;
  resets timestamptz := (date_trunc('month', now() at time zone 'utc') + interval '1 month') at time zone 'utc';
  new_used integer;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if public.is_premium(uid) then
    return jsonb_build_object('allowed', true, 'premium', true);
  end if;

  -- One statement: create this month's row, or add one only while still under the limit.
  insert into public.schedule_generations as g (user_id, period, used)
  values (uid, this_month, 1)
  on conflict (user_id, period) do update
    set used = g.used + 1, updated_at = now()
    where g.used < free_limit
  returning g.used into new_used;

  if new_used is null then
    return jsonb_build_object('allowed', false, 'premium', false, 'limit', free_limit, 'used', free_limit, 'resets_at', resets);
  end if;
  return jsonb_build_object('allowed', true, 'premium', false, 'limit', free_limit, 'used', new_used, 'resets_at', resets);
end;
$$;

revoke all on function public.schedule_generation_usage() from public;
revoke all on function public.consume_schedule_generation() from public;
grant execute on function public.schedule_generation_usage() to authenticated;
grant execute on function public.consume_schedule_generation() to authenticated;

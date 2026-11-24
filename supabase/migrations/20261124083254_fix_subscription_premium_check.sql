-- Repair projects where the subscription table uses admin billing fields but
-- is_premium still refers to the old expires_at column. Schedule generation
-- calls this function for both Free and Premium students.
alter table public.subscriptions
  add column if not exists status text not null default 'active',
  add column if not exists current_period_end timestamptz;

create or replace function public.is_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.plan = 'premium'
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke all on function public.is_premium(uuid) from public, anon;
grant execute on function public.is_premium(uuid) to authenticated;

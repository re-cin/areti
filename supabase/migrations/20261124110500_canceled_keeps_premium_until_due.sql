-- A canceled subscription won't renew, but the student keeps Premium until its due time
-- (current_period_end). Same rule as the app (recordFromRow) and the admin site (isPremium).
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
      and (
        (s.status in ('active', 'trialing') and (s.current_period_end is null or s.current_period_end > now()))
        or (s.status = 'canceled' and s.current_period_end > now())
      )
  );
$$;

revoke all on function public.is_premium(uuid) from public, anon;
grant execute on function public.is_premium(uuid) to authenticated;

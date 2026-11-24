-- When a canceled subscription reaches its due time it ends: back to the Free plan, status expired.
-- (Before, only the status changed, so the admin site still showed a Premium badge.)
create or replace function public.renew_due_subscriptions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  step interval;
  next_end timestamptz;
begin
  for r in
    select user_id, billing_period, current_period_end from public.subscriptions
    where plan = 'premium' and status in ('active', 'trialing')
      and current_period_end is not null and current_period_end <= now()
    for update
  loop
    step := case r.billing_period when 'weekly' then interval '7 days' when 'yearly' then interval '1 year' else interval '1 month' end;
    next_end := r.current_period_end;
    while next_end <= now() loop
      next_end := next_end + step;
    end loop;
    update public.subscriptions set current_period_end = next_end, updated_at = now() where user_id = r.user_id;
  end loop;

  update public.subscriptions set plan = 'free', status = 'expired', updated_at = now()
  where plan = 'premium' and status in ('canceled', 'expired')
    and (current_period_end is null or current_period_end <= now());
end;
$$;

revoke all on function public.renew_due_subscriptions() from public, anon, authenticated;

-- Fix rows that already ended the old way.
update public.subscriptions set plan = 'free', updated_at = now()
where plan = 'premium' and status = 'expired';

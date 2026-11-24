-- School project: subscriptions renew on their own, with no payment.
-- Every minute: an active (or trial) Premium whose due time has passed moves to its next due time
-- (one week / month / year later, by billing_period; monthly if unset). A canceled one that reached
-- its due time becomes expired. Realtime then pushes the change to the student's phone.
create extension if not exists pg_cron;

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

  update public.subscriptions set status = 'expired', updated_at = now()
  where plan = 'premium' and status = 'canceled' and current_period_end is not null and current_period_end <= now();
end;
$$;

revoke all on function public.renew_due_subscriptions() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'renew-due-subscriptions';
select cron.schedule('renew-due-subscriptions', '* * * * *', 'select public.renew_due_subscriptions()');

-- Active and trial subscriptions are Premium regardless of the due time (they renew);
-- a canceled one only until its due time.
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
        s.status in ('active', 'trialing')
        or (s.status = 'canceled' and s.current_period_end > now())
      )
  );
$$;

revoke all on function public.is_premium(uuid) from public, anon;
grant execute on function public.is_premium(uuid) to authenticated;

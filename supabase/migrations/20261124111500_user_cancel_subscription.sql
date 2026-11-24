-- Students can't write public.subscriptions (RLS). These two functions let a signed-in student
-- cancel their own Premium (it stays until current_period_end) or undo the cancel before then.
create or replace function public.cancel_my_subscription()
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with changed as (
    update public.subscriptions
    set status = 'canceled', updated_at = now()
    where user_id = auth.uid()
      and plan = 'premium'
      and status in ('active', 'trialing')
    returning 1
  )
  select exists (select 1 from changed);
$$;

create or replace function public.resume_my_subscription()
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with changed as (
    update public.subscriptions
    set status = 'active', updated_at = now()
    where user_id = auth.uid()
      and plan = 'premium'
      and status = 'canceled'
      and current_period_end > now()
    returning 1
  )
  select exists (select 1 from changed);
$$;

revoke all on function public.cancel_my_subscription() from public, anon;
revoke all on function public.resume_my_subscription() from public, anon;
grant execute on function public.cancel_my_subscription() to authenticated;
grant execute on function public.resume_my_subscription() to authenticated;

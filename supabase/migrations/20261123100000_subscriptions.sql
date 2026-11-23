-- Free vs Premium. The server is the only authority on a student's plan.
--
--  * public.subscriptions holds one row per user. Students can READ their own row but can never
--    write it: there is deliberately no insert/update/delete policy. Only the service role
--    (your payment webhook / dashboard) changes plans.
--  * Phones cache the row locally (src/features/subscription) to schedule offline.
--  * Premium-only data is also refused here, so a modified app cannot sync it:
--      - exam priority  (settings keys 'exam-priority:<plan id>')
--      - the cached plan itself (settings key 'subscription.plan') can never be uploaded.
--    Like areti_sync_row, refused rows are skipped silently (return null) so one rejected row
--    never fails a whole sync batch.

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  -- null = no expiry (e.g. lifetime or a plan managed outside the app)
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users read their own subscription" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- True only for an unexpired premium plan. Missing rows are Free.
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
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

revoke all on function public.is_premium(uuid) from public;
grant execute on function public.is_premium(uuid) to authenticated;

create or replace function public.areti_premium_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A phone must never upload its own claim about the plan.
  if new.key = 'subscription.plan' then
    return null;
  end if;
  if new.key like 'exam-priority:%' and not public.is_premium(coalesce(new.user_id, auth.uid())) then
    return null;
  end if;
  return new;
end;
$$;

-- Trigger names fire alphabetically: this runs before areti_sync_row.
create trigger areti_premium_settings before insert or update on public.settings
  for each row execute function public.areti_premium_settings();

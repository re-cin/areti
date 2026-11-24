-- Premium prices per plan type, read by the app and by the paypal-checkout Edge Function.
-- Change prices or the student discount here; nothing in the app needs a new build.
create table public.plan_prices (
  plan text primary key check (plan in ('monthly', 'yearly')),
  label text not null,
  period_months integer not null check (period_months between 1 and 36),
  price numeric(10, 2) not null check (price > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  student_discount_percent numeric(5, 2) not null default 0
    check (student_discount_percent >= 0 and student_discount_percent < 100),
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.plan_prices enable row level security;

-- Anyone can see the active prices (they are shown before buying).
create policy "Anyone reads active plan prices"
  on public.plan_prices for select
  to anon, authenticated
  using (active);

-- Only admins change prices.
create policy "Admins manage plan prices"
  on public.plan_prices for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.plan_prices_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger plan_prices_touch
  before update on public.plan_prices
  for each row execute function public.plan_prices_touch();

-- Starting values: the sandbox test prices. Student discount starts at 0% until the team decides it.
insert into public.plan_prices (plan, label, period_months, price, currency, student_discount_percent, sort_order) values
  ('yearly', 'Yearly plan', 12, 1199.00, 'PHP', 0, 1),
  ('monthly', 'Monthly plan', 1, 149.00, 'PHP', 0, 2);

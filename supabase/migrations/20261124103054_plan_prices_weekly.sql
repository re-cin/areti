-- Weekly plan. A plan lasts either a number of months or a number of days (weekly = 7 days).
alter table public.plan_prices drop constraint plan_prices_plan_check;
alter table public.plan_prices add constraint plan_prices_plan_check check (plan in ('weekly', 'monthly', 'yearly'));

alter table public.plan_prices alter column period_months drop not null;
alter table public.plan_prices add column period_days integer check (period_days between 1 and 90);
alter table public.plan_prices add constraint plan_prices_one_period
  check ((period_months is null) <> (period_days is null));

comment on column public.plan_prices.period_months is 'Plan length in months (monthly 1, yearly 12). Null when period_days is used.';
comment on column public.plan_prices.period_days is 'Plan length in days (weekly 7). Null when period_months is used.';

-- Weekly: ₱59 (≈ ₱255/month), students ₱29. Shown after yearly and monthly.
insert into public.plan_prices (plan, label, period_months, period_days, price, student_price, currency, sort_order)
values ('weekly', 'Weekly plan', null, 7, 59.00, 29.00, 'PHP', 3);

-- Students pay an exact price instead of a percentage (₱80 of ₱180 is not a round percent).
alter table public.plan_prices
  add column student_price numeric(10, 2) check (student_price is null or (student_price > 0 and student_price <= price));

alter table public.plan_prices drop column student_discount_percent;

comment on column public.plan_prices.student_price is 'What students pay for this plan. Null = no student price.';

-- Monthly: ₱180, students ₱80. Yearly stays ₱1,199 with no student price.
-- (Student price first so the check student_price <= price holds at every step.)
update public.plan_prices set price = 180.00, student_price = 80.00 where plan = 'monthly';
update public.plan_prices set student_price = null where plan = 'yearly';

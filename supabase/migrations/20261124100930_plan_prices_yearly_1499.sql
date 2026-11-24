-- Yearly: ₱1,499 (≈ ₱125/month, 31% off monthly), students ₱699 (≈ ₱58/month, 27% off ₱80 monthly).
update public.plan_prices set price = 1499.00, student_price = 699.00 where plan = 'yearly';

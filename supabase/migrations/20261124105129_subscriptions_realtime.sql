-- Push subscription changes to the app as they happen (admin edits, PayPal payments), so the
-- "24 hours / 1 hour of Premium left" pop-ups and the Premium card update right away.
-- Row level security still applies: each user only receives their own row.
alter publication supabase_realtime add table public.subscriptions;

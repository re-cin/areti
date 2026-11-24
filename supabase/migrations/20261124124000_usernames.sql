-- Unique usernames, chosen at sign-up (stored lowercase): 3-20 characters, letters, numbers, _ and .
-- The app sends it as user metadata in auth.signUp; the trigger below saves it here.
-- Sign in with a username goes through the username-sign-in edge function (emails stay private).
create table public.usernames (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint usernames_format check (username ~ '^[a-z0-9][a-z0-9_.]{2,19}$')
);
create unique index usernames_username_key on public.usernames (username);

alter table public.usernames enable row level security;
create policy "Users read their own username" on public.usernames
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Admins read all usernames" on public.usernames
  for select to authenticated using ((select public.is_admin()));

-- Sign-up form: is this username free? (callable before signing in)
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(trim(p_username)) ~ '^[a-z0-9][a-z0-9_.]{2,19}$'
     and not exists (select 1 from public.usernames u where u.username = lower(trim(p_username)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Saves the username from the sign-up metadata. A taken username makes the sign-up fail
-- (unique index), which the app shows as "That username is taken".
create or replace function public.save_username_from_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := lower(trim(new.raw_user_meta_data ->> 'username'));
begin
  if name is null or name = '' then
    return new;
  end if;
  insert into public.usernames (user_id, username) values (new.id, name)
  on conflict (user_id) do update set username = excluded.username;
  return new;
end;
$$;
revoke all on function public.save_username_from_metadata() from public, anon, authenticated;

create trigger save_username_on_signup
  after insert on auth.users
  for each row execute function public.save_username_from_metadata();

create trigger save_username_on_metadata_change
  after update of raw_user_meta_data on auth.users
  for each row
  when (old.raw_user_meta_data ->> 'username' is distinct from new.raw_user_meta_data ->> 'username')
  execute function public.save_username_from_metadata();

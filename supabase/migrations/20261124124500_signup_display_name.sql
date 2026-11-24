-- Sign-up asks for a display name instead of a unique username.
-- 1) Remove the username setup (it was applied in the cloud before being replaced).
drop trigger if exists save_username_on_signup on auth.users;
drop trigger if exists save_username_on_metadata_change on auth.users;
drop function if exists public.save_username_from_metadata();
drop function if exists public.username_available(text);
drop table if exists public.usernames;

-- 2) The app sends the display name as user metadata in auth.signUp. This saves it as the
--    account's profile row (id = user id, like src/db/queries/profile.ts), which then syncs
--    to the phone like any other profile change.
create or replace function public.save_profile_from_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := left(trim(new.raw_user_meta_data ->> 'display_name'), 40);
begin
  if name is null or name = '' then
    return new;
  end if;
  insert into public.profile (id, user_id, updated_at, display_name)
  values (new.id::text, new.id, (extract(epoch from clock_timestamp()) * 1000)::bigint, name)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.save_profile_from_signup() from public, anon, authenticated;

create trigger save_profile_on_signup
  after insert on auth.users
  for each row execute function public.save_profile_from_signup();

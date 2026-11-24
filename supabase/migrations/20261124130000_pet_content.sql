-- Admin website → Pet: expressions and dialogue that admins add.
--  * public.pet_expressions: an added expression = a looping WebP animation of the pet, attached to one
--    built-in "slot" (a status such as Overjoyed or Focused, or an event such as Level up). When that slot
--    comes up on the phone, it picks at random among the unlocked built-in and added expressions for it.
--  * public.pet_dialogues: extra lines, each attached to one expression (a built-in id such as 'neutral',
--    or an added expression as 'custom:<uuid>').
--  * Storage bucket "pet": the WebP files. Anyone with the link can load them; only admins upload/delete.
-- Signed-in app users read the enabled rows; only admins (public.is_admin()) change anything.
-- Safe to run more than once.

create table if not exists public.pet_expressions (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 40),
  slot text not null check (slot in (
    'neutral', 'slightlyHappy', 'overjoyed', 'sad', 'tired',
    'focused', 'sleeping', 'nervous', 'tiredFocus', 'tiredNervous',
    'memoryFlash', 'goalCelebration')),
  unlock_level integer not null default 1,
  file_path text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid()
);

create table if not exists public.pet_dialogues (
  id uuid primary key default gen_random_uuid(),
  expression_key text not null check (char_length(expression_key) between 1 and 60),
  line text not null check (char_length(line) between 1 and 120),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid()
);

-- Unlock level: any whole number from 1 up (levels are not capped at 8). Replaces the first 1–8 check
-- if this file was run before.
alter table public.pet_expressions drop constraint if exists pet_expressions_unlock_level_check;
alter table public.pet_expressions add constraint pet_expressions_unlock_level_check check (unlock_level between 1 and 999);

alter table public.pet_expressions enable row level security;
alter table public.pet_dialogues enable row level security;

drop policy if exists "Users read enabled pet expressions" on public.pet_expressions;
create policy "Users read enabled pet expressions" on public.pet_expressions
  for select to authenticated using (enabled or (select public.is_admin()));
drop policy if exists "Admins manage pet expressions" on public.pet_expressions;
create policy "Admins manage pet expressions" on public.pet_expressions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Users read enabled pet dialogues" on public.pet_dialogues;
create policy "Users read enabled pet dialogues" on public.pet_dialogues
  for select to authenticated using (enabled or (select public.is_admin()));
drop policy if exists "Admins manage pet dialogues" on public.pet_dialogues;
create policy "Admins manage pet dialogues" on public.pet_dialogues
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Storage: animated WebP only, up to 5 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet', 'pet', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

drop policy if exists "Admins upload pet art" on storage.objects;
create policy "Admins upload pet art" on storage.objects
  for insert to authenticated with check (bucket_id = 'pet' and (select public.is_admin()));
drop policy if exists "Admins read pet art" on storage.objects;
create policy "Admins read pet art" on storage.objects
  for select to authenticated using (bucket_id = 'pet' and (select public.is_admin()));
drop policy if exists "Admins delete pet art" on storage.objects;
create policy "Admins delete pet art" on storage.objects
  for delete to authenticated using (bucket_id = 'pet' and (select public.is_admin()));

notify pgrst, 'reload schema';

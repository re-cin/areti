-- Admin website → Controls → Music.
-- Admins upload audio files (background music or notification sounds) to the "music"
-- Storage bucket, and each upload gets a row in public.app_music.
-- Signed-in app users can read the enabled ones (so a future app version can offer them);
-- only admins can add, change or delete them.
-- Safe to run more than once.

create table if not exists public.app_music (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'background' check (kind in ('background', 'notification')),
  file_path text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid()
);
alter table public.app_music enable row level security;

drop policy if exists "Users read enabled music" on public.app_music;
create policy "Users read enabled music" on public.app_music
  for select to authenticated
  using (enabled or (select public.is_admin()));

drop policy if exists "Admins manage music" on public.app_music;
create policy "Admins manage music" on public.app_music
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Storage: anyone with the link can play a file; only admins can upload or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music', 'music', true, 20971520,
        array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'])
on conflict (id) do nothing;

drop policy if exists "Admins upload music" on storage.objects;
create policy "Admins upload music" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'music' and (select public.is_admin()));

drop policy if exists "Admins read music files" on storage.objects;
create policy "Admins read music files" on storage.objects
  for select to authenticated
  using (bucket_id = 'music' and (select public.is_admin()));

drop policy if exists "Admins delete music" on storage.objects;
create policy "Admins delete music" on storage.objects
  for delete to authenticated
  using (bucket_id = 'music' and (select public.is_admin()));

notify pgrst, 'reload schema';

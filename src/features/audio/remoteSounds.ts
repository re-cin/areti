import { create } from 'zustand';
import { deviceStorage } from '@/lib/storage';
import { supabase, supabaseConfigured } from '@/lib/supabase';

// Music added by admins on the admin website (Controls → Music). Rows live in
// public.app_music, files in the public "music" Storage bucket. Only enabled ones are
// readable by the app (row level security). The list is cached on the phone, so the
// names still show offline; playing a sound streams it, so that part needs internet.

export type RemoteSound = { title: string; url: string };
type Lists = { background: RemoteSound[]; notification: RemoteSound[] };

const CACHE_KEY = 'remoteSounds.v1';

export const useRemoteSounds = create<Lists>(() => ({ background: [], notification: [] }));

/** Loads the cached list right away (no network). */
export async function loadCachedRemoteSounds() {
  try {
    const raw = await deviceStorage.getItem(CACHE_KEY);
    if (raw) useRemoteSounds.setState(JSON.parse(raw) as Lists);
  } catch {
    // A bad cache just means no extra sounds until the next refresh.
  }
}

/** Fetches the enabled sounds from Supabase. Needs a signed-in user; silently keeps the old list otherwise. */
export async function refreshRemoteSounds() {
  if (!supabaseConfigured) return;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return;
  const { data, error } = await supabase
    .from('app_music')
    .select('title, kind, file_path')
    .eq('enabled', true)
    .order('created_at', { ascending: true });
  if (error || !data) return;
  const url = (path: string) => supabase.storage.from('music').getPublicUrl(path).data.publicUrl;
  const lists: Lists = {
    background: data.filter((r) => r.kind === 'background').map((r) => ({ title: r.title, url: url(r.file_path) })),
    notification: data.filter((r) => r.kind === 'notification').map((r) => ({ title: r.title, url: url(r.file_path) })),
  };
  useRemoteSounds.setState(lists);
  await deviceStorage.setItem(CACHE_KEY, JSON.stringify(lists)).catch(() => {});
}

export const remoteBackgroundUrl = (name: string) =>
  useRemoteSounds.getState().background.find((s) => s.title === name)?.url ?? null;
export const remoteNotificationUrl = (name: string) =>
  useRemoteSounds.getState().notification.find((s) => s.title === name)?.url ?? null;

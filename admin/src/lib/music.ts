import { supabase, supabaseConfigured } from './supabase';
import type { Music, MusicKind } from './types';

// Controls → Music. Files live in the "music" Storage bucket, rows in public.app_music
// (supabase/migrations/20261123160000_app_music.sql).

const BUCKET = 'music';
let demo: Music[] = [];

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

export async function listMusic(): Promise<Music[]> {
  if (!supabaseConfigured) return [...demo];
  const { data, error } = await supabase.from('app_music').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((m) => ({ ...m, url: publicUrl(m.file_path) })) as Music[];
}

export async function addMusic(file: File, title: string, kind: MusicKind) {
  if (!supabaseConfigured) {
    demo = [{ id: crypto.randomUUID(), title, kind, file_path: file.name, enabled: true, created_at: new Date().toISOString(), url: URL.createObjectURL(file) }, ...demo];
    return;
  }
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'm4a';
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'audio/mp4' });
  if (up.error) throw up.error;
  const { error } = await supabase.from('app_music').insert({ title, kind, file_path: path });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]); // don't leave a file with no row
    throw error;
  }
}

export async function setMusicEnabled(id: string, enabled: boolean) {
  if (!supabaseConfigured) {
    demo = demo.map((m) => (m.id === id ? { ...m, enabled } : m));
    return;
  }
  const { error } = await supabase.from('app_music').update({ enabled }).eq('id', id);
  if (error) throw error;
}

export async function deleteMusic(m: Music) {
  if (!supabaseConfigured) {
    demo = demo.filter((x) => x.id !== m.id);
    return;
  }
  const { error } = await supabase.from('app_music').delete().eq('id', m.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([m.file_path]);
}

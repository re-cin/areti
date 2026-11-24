import { create } from 'zustand';
import { deviceStorage } from '@/lib/storage';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { isSlot, type CustomExpression, type CustomLine } from './slots';

// Expressions and dialogue added by admins on the admin website (Pet tab). Rows live in public.pet_expressions
// and public.pet_dialogues, files in the public "pet" Storage bucket (supabase/migrations/20261124130000_pet_content.sql).
// Only enabled rows are readable by the app. The list is cached on the phone, so lines still work offline;
// the WebP animations load from the internet (expo-image keeps them in its cache after the first time).

type Content = { expressions: CustomExpression[]; lines: CustomLine[] };

const CACHE_KEY = 'petContent.v1';

export const usePetContent = create<Content>(() => ({ expressions: [], lines: [] }));

/** Loads the cached content right away (no network). */
export async function loadCachedPetContent() {
  try {
    const raw = await deviceStorage.getItem(CACHE_KEY);
    if (raw) usePetContent.setState(JSON.parse(raw) as Content);
  } catch {
    // A bad cache just means no added expressions until the next refresh.
  }
}

/** Fetches enabled expressions and lines. Needs a signed-in user; silently keeps the old content otherwise. */
export async function refreshPetContent() {
  if (!supabaseConfigured) return;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return;
  const [ex, dl] = await Promise.all([
    supabase.from('pet_expressions').select('id, label, slot, unlock_level, file_path').eq('enabled', true).order('created_at'),
    supabase.from('pet_dialogues').select('expression_key, line').eq('enabled', true).order('created_at'),
  ]);
  if (ex.error || dl.error || !ex.data || !dl.data) return;
  const url = (path: string) => supabase.storage.from('pet').getPublicUrl(path).data.publicUrl;
  const content: Content = {
    expressions: ex.data
      .filter((r) => isSlot(r.slot))
      .map((r) => ({ id: r.id, label: r.label, slot: r.slot, unlockLevel: r.unlock_level, url: url(r.file_path) })),
    lines: dl.data.map((r) => ({ expression: r.expression_key, text: r.line })),
  };
  usePetContent.setState(content);
  await deviceStorage.setItem(CACHE_KEY, JSON.stringify(content)).catch(() => {});
}

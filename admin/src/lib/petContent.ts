import { supabase, supabaseConfigured } from './supabase';
import type { ExpressionId } from '../../../src/features/pet/types';

// Pet tab: expressions and dialogue that admins add. Files live in the "pet" Storage bucket, rows in
// public.pet_expressions and public.pet_dialogues (supabase/migrations/20261124130000_pet_content.sql).

const BUCKET = 'pet';

export type PetExpressionRow = {
  id: string;
  label: string;
  slot: ExpressionId;
  unlock_level: number;
  file_path: string;
  enabled: boolean;
  created_at: string;
  url: string;
};

export type PetDialogueRow = { id: string; expression_key: string; line: string; enabled: boolean; created_at: string };

let demoExpressions: PetExpressionRow[] = [];
let demoLines: PetDialogueRow[] = [];

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const fail = (e: { message: string } | null) => { if (e) throw e; };

export async function listPetExpressions(): Promise<PetExpressionRow[]> {
  if (!supabaseConfigured) return [...demoExpressions];
  const { data, error } = await supabase.from('pet_expressions').select('*').order('created_at', { ascending: true });
  fail(error);
  return (data ?? []).map((r) => ({ ...r, url: publicUrl(r.file_path) })) as PetExpressionRow[];
}

/** Uploads a looping WebP and attaches it to a status or event slot. */
export async function addPetExpression(file: File, label: string, slot: ExpressionId, unlockLevel: number) {
  if (file.type !== 'image/webp' && !file.name.toLowerCase().endsWith('.webp')) throw new Error('Choose a .webp file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('That file is bigger than 5 MB.');
  if (!supabaseConfigured) {
    demoExpressions = [...demoExpressions, { id: crypto.randomUUID(), label, slot, unlock_level: unlockLevel, file_path: file.name,
      enabled: true, created_at: new Date().toISOString(), url: URL.createObjectURL(file) }];
    return;
  }
  const path = `expressions/${crypto.randomUUID()}.webp`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'image/webp' });
  fail(up.error);
  const { error } = await supabase.from('pet_expressions').insert({ label, slot, unlock_level: unlockLevel, file_path: path });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]); // don't leave a file with no row
    throw error;
  }
}

export async function updatePetExpression(id: string, change: Partial<Pick<PetExpressionRow, 'label' | 'slot' | 'unlock_level' | 'enabled'>>) {
  if (!supabaseConfigured) {
    demoExpressions = demoExpressions.map((r) => (r.id === id ? { ...r, ...change } : r));
    return;
  }
  const { error } = await supabase.from('pet_expressions').update(change).eq('id', id);
  fail(error);
}

/** Deletes the expression, its file and the lines attached to it. */
export async function deletePetExpression(row: PetExpressionRow) {
  const key = `custom:${row.id}`;
  if (!supabaseConfigured) {
    demoExpressions = demoExpressions.filter((r) => r.id !== row.id);
    demoLines = demoLines.filter((l) => l.expression_key !== key);
    return;
  }
  fail((await supabase.from('pet_dialogues').delete().eq('expression_key', key)).error);
  fail((await supabase.from('pet_expressions').delete().eq('id', row.id)).error);
  await supabase.storage.from(BUCKET).remove([row.file_path]);
}

export async function listPetDialogues(): Promise<PetDialogueRow[]> {
  if (!supabaseConfigured) return [...demoLines];
  const { data, error } = await supabase.from('pet_dialogues').select('*').order('created_at', { ascending: true });
  fail(error);
  return (data ?? []) as PetDialogueRow[];
}

export async function addPetDialogue(expressionKey: string, line: string) {
  const text = line.trim();
  if (!text) throw new Error('Write a line first.');
  if (text.length > 120) throw new Error('Keep a line under 120 characters.');
  if (!supabaseConfigured) {
    demoLines = [...demoLines, { id: crypto.randomUUID(), expression_key: expressionKey, line: text, enabled: true, created_at: new Date().toISOString() }];
    return;
  }
  fail((await supabase.from('pet_dialogues').insert({ expression_key: expressionKey, line: text })).error);
}

export async function setPetDialogueEnabled(id: string, enabled: boolean) {
  if (!supabaseConfigured) {
    demoLines = demoLines.map((l) => (l.id === id ? { ...l, enabled } : l));
    return;
  }
  fail((await supabase.from('pet_dialogues').update({ enabled }).eq('id', id)).error);
}

export async function deletePetDialogue(id: string) {
  if (!supabaseConfigured) {
    demoLines = demoLines.filter((l) => l.id !== id);
    return;
  }
  fail((await supabase.from('pet_dialogues').delete().eq('id', id)).error);
}

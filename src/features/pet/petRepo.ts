import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { ghostState } from '@/db/schema';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { addXp, xpToNextLevel } from './xp';

export type Ghost = { id: string; level: number; xp: number; xpToNext: number };

/** The one ghost row. Created on first use. */
export async function getGhost(): Promise<Ghost> {
  const rows = await db.select().from(ghostState).where(isNull(ghostState.deletedAt)).limit(1);
  let row = rows[0];
  if (!row) {
    // Signed in, the ghost's id is the account id, so phones syncing the same account share one ghost.
    const userId = supabaseConfigured ? (await supabase.auth.getSession()).data.session?.user.id : undefined;
    const id = userId ?? newId();
    await db.insert(ghostState).values({ id, updatedAt: Date.now() }).onConflictDoNothing();
    row = (await db.select().from(ghostState).where(eq(ghostState.id, id)).limit(1))[0];
  }
  return { id: row.id, level: row.level, xp: row.xp, xpToNext: xpToNextLevel(row.level) };
}

export async function awardXp(gained: number): Promise<void> {
  if (gained <= 0) return;
  const ghost = await getGhost();
  const next = addXp(ghost.level, ghost.xp, gained);
  await db
    .update(ghostState)
    .set({ level: next.level, xp: next.xp, updatedAt: Date.now() })
    .where(eq(ghostState.id, ghost.id));
}

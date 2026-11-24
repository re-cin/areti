import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { focusSessions, ghostState } from '@/db/schema';
import { dayKey } from '@/lib/dateHelpers';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { addXp, creditedMinutes, DAILY_CREDIT_CAP_MIN, xpToNextLevel } from './xp';

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
  // Level and XP are worked out from the logged focus time itself (credited minutes, at most ~10 h a
  // day), so they always match Statistics: clearing study history resets them, and two phones can't
  // overwrite each other's XP. The ghost row is kept up to date for the cloud copy.
  const { level, xp } = await xpFromFocusLog();
  if (row.level !== level || row.xp !== xp) {
    await db.update(ghostState).set({ level, xp, updatedAt: Date.now() }).where(eq(ghostState.id, row.id));
  }
  return { id: row.id, level, xp, xpToNext: xpToNextLevel(level) };
}

/** Total XP from every focus block still in the log: credited minutes, capped per day. */
async function xpFromFocusLog(): Promise<{ level: number; xp: number }> {
  const rows = await db
    .select({ startedAt: focusSessions.startedAt, durationSec: focusSessions.durationSec })
    .from(focusSessions)
    .where(isNull(focusSessions.deletedAt));
  const perDay = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r.startedAt);
    perDay.set(k, (perDay.get(k) ?? 0) + creditedMinutes(r.durationSec));
  }
  let total = 0;
  for (const m of perDay.values()) total += Math.min(m, DAILY_CREDIT_CAP_MIN);
  return addXp(1, 0, total);
}

/** Called after a focus block is saved: re-works out level and XP from the log (the new block included). */
export async function awardXp(gained: number): Promise<void> {
  if (gained <= 0) return;
  await getGhost();
}

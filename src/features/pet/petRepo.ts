import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { focusSessions, ghostState } from '@/db/schema';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { focusStats } from './focusLog';
import { LEVEL_THRESHOLDS, levelProgress, MAX_LEVEL } from './levels';

/** Reti's level as Pomodoro and Statistics show it. Same numbers as the Reti tab. */
export type Ghost = {
  id: string;
  level: number;
  /** EXP inside the current level. */
  xp: number;
  /** EXP the current level needs in total (0 at the max level). */
  xpToNext: number;
  totalExp: number;
  maxLevel: boolean;
  /** "40 / 120 XP", or "MAX" at the last level. */
  label: string;
};

export const DEFAULT_GHOST: Ghost = { id: '', level: 1, xp: 0, xpToNext: LEVEL_THRESHOLDS[1], totalExp: 0, maxLevel: false, label: `0 / ${LEVEL_THRESHOLDS[1]} XP` };

/** Level numbers from total EXP, in the shape Pomodoro and Statistics use. */
export function ghostLevel(totalExp: number): Omit<Ghost, 'id'> {
  const p = levelProgress(totalExp);
  const start = LEVEL_THRESHOLDS[p.level - 1];
  const maxLevel = p.level >= MAX_LEVEL;
  const xp = totalExp - start;
  const xpToNext = p.nextLevelExp === null ? 0 : p.nextLevelExp - start;
  return { level: p.level, xp, xpToNext, totalExp, maxLevel, label: maxLevel ? 'MAX' : `${xp} / ${xpToNext} XP` };
}

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
  // Level and EXP are worked out from the logged focus time itself with the same rules as the Reti tab
  // (credited minutes, daily cap, streak bonus, spec thresholds), so every tab agrees: clearing study
  // history resets them, and two phones can't overwrite each other's EXP. The row keeps a cloud copy.
  const records = await db
    .select({ startedAt: focusSessions.startedAt, durationSec: focusSessions.durationSec, completed: focusSessions.completed })
    .from(focusSessions)
    .where(isNull(focusSessions.deletedAt));
  const level = ghostLevel(focusStats(records, Date.now()).totalExp);
  if (row.level !== level.level || row.xp !== level.totalExp) {
    await db.update(ghostState).set({ level: level.level, xp: level.totalExp, updatedAt: Date.now() }).where(eq(ghostState.id, row.id));
  }
  return { id: row.id, ...level };
}

/** Called after a focus block is saved: re-works out level and EXP from the log (the new block included). */
export async function awardXp(gained: number): Promise<void> {
  if (gained <= 0) return;
  await getGhost();
}

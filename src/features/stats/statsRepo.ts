import { asc, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { focusSessions } from '@/db/schema';
import type { StatSession } from './stats';

/** Every focus session that has not been cleared. Small enough to aggregate in memory. */
export async function loadStatSessions(): Promise<StatSession[]> {
  return db
    .select({
      startedAt: focusSessions.startedAt,
      durationSec: focusSessions.durationSec,
      completed: focusSessions.completed,
      subjectId: focusSessions.subjectId,
    })
    .from(focusSessions)
    .where(isNull(focusSessions.deletedAt))
    .orderBy(asc(focusSessions.startedAt));
}

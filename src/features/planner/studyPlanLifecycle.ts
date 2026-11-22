import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { db } from '@/db/client';
import { plannedSessions, settings, studyPlans, tasks } from '@/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Cancel pending work atomically; focus logs, earned XP and completed tasks are history. */
export function cancelStudyPlanWork(tx: Transaction, ids: string[], now: number, archive = true) {
  if (!ids.length) return { detachedSessionId: null as string | null, changed: false };
  let changes = 0;
  const generated = tx.select().from(tasks).where(and(eq(tasks.source, 'generated'), inArray(tasks.planId, ids))).all();
  // Also retire legacy task-linked Pomodoros created for the same generated task.
  const planIds = [...ids, ...generated.map(task => `task:${task.id}`)];
  const sessions = tx.select().from(plannedSessions).where(inArray(plannedSessions.planId, planIds)).all();
  const timerSetting = tx.select().from(settings).where(eq(settings.key, 'timer.state')).get();
  let detachedSessionId: string | null = null;
  if (timerSetting) {
    let timer: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(timerSetting.value);
      if (parsed && typeof parsed === 'object') timer = parsed;
    } catch { /* An unreadable saved timer must not block cancellation. */ }
    if (timer && typeof timer.plannedSessionId === 'string' && sessions.some(session => session.id === timer!.plannedSessionId)) {
      detachedSessionId = timer.plannedSessionId;
      changes += tx.update(settings).set({ value: JSON.stringify({ ...timer, plannedSessionId: null }), updatedAt: now })
        .where(eq(settings.key, 'timer.state')).run().changes;
    }
  }
  if (archive) changes += tx.update(studyPlans).set({ status: 'archived', deletedAt: now, updatedAt: now })
    .where(and(inArray(studyPlans.id, ids), isNull(studyPlans.deletedAt))).run().changes;
  changes += tx.update(plannedSessions).set({ deletedAt: now, updatedAt: now })
    .where(and(inArray(plannedSessions.planId, planIds), isNull(plannedSessions.deletedAt), sql`${plannedSessions.completedBlocks} < ${plannedSessions.blocks}`)).run().changes;
  changes += tx.update(tasks).set({ deletedAt: now, updatedAt: now })
    .where(and(inArray(tasks.planId, ids), eq(tasks.source, 'generated'), eq(tasks.done, false), isNull(tasks.deletedAt))).run().changes;
  return { detachedSessionId, changed: changes > 0 };
}

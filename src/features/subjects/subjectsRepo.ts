import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { plannedSessions, studyPlans, subjects, tasks } from '@/db/schema';
import { refreshSessionReminders } from '@/features/timer/reminders';
import { cancelStudyPlanWork } from '@/features/planner/studyPlanLifecycle';
import { bumpData } from '@/stores/dataVersion';

export type SubjectRow = {
  id: string;
  name: string;
  color: string;
};

export async function listSubjects(): Promise<SubjectRow[]> {
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      color: subjects.color,
    })
    .from(subjects)
    .where(isNull(subjects.deletedAt))
    .orderBy(asc(subjects.sortOrder), asc(subjects.name));
  return rows;
}

/** Includes deleted subjects, so old focus sessions still show their name and color. */
export async function subjectLookup(): Promise<Map<string, SubjectRow>> {
  const rows = await db.select({ id: subjects.id, name: subjects.name, color: subjects.color }).from(subjects);
  return new Map(rows.map((r) => [r.id, r]));
}

export async function addSubject(name: string, color: string): Promise<void> {
  const existing = await listSubjects();
  await db.insert(subjects).values({
    id: newId(),
    name: name.trim(),
    color,
    sortOrder: existing.length,
    updatedAt: Date.now(),
  });
  bumpData();
}

export async function renameSubject(id: string, name: string): Promise<void> {
  await db.update(subjects).set({ name: name.trim(), updatedAt: Date.now() }).where(eq(subjects.id, id));
  bumpData();
}

export async function updateSubjectUrgency(id: string, urgency: number): Promise<void> {
  if (!Number.isInteger(urgency) || urgency < 1 || urgency > 5) throw new Error('Choose an urgency from 1 to 5.');
  await db.update(subjects).set({ urgency, updatedAt: Date.now() })
    .where(and(eq(subjects.id, id), isNull(subjects.deletedAt)));
  bumpData();
}

export async function reorderSubjects(orderedIds: string[]): Promise<void> {
  const now = Date.now();

  for (const [index, id] of orderedIds.entries()) {
    await db
      .update(subjects)
      .set({ sortOrder: index, updatedAt: now })
      .where(eq(subjects.id, id));
  }

  bumpData();
}

/**
 * Soft delete (sync-ready). Its exam plans, upcoming planned sessions and unfinished tasks go with it.
 * Finished tasks and past focus time stay in statistics.
 */
export async function deleteSubject(id: string): Promise<void> {
  const now = Date.now();
  db.transaction(tx => {
    const plans = tx.select().from(studyPlans).where(eq(studyPlans.subjectId, id)).all();
    tx.update(subjects).set({ deletedAt: now, updatedAt: now }).where(eq(subjects.id, id)).run();
    cancelStudyPlanWork(tx, plans.map(plan => plan.id), now);
    tx.update(plannedSessions).set({ deletedAt: now, updatedAt: now })
      .where(and(eq(plannedSessions.subjectId, id), isNull(plannedSessions.deletedAt))).run();
    tx.update(tasks).set({ deletedAt: now, updatedAt: now })
      .where(and(eq(tasks.subjectId, id), eq(tasks.done, false), isNull(tasks.deletedAt))).run();
  });
  // Other subjects' plans stay as they are; they only change on Save / Reschedule.
  void refreshSessionReminders();
  bumpData();
}

export async function setSubjectColor(id: string, color: string): Promise<void> {
  await db.update(subjects).set({ color, updatedAt: Date.now() }).where(eq(subjects.id, id));
  bumpData();
}

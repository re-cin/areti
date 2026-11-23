import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { plannedSessions, studyPlans, subjects, tasks } from '@/db/schema';
import { refreshSessionReminders } from '@/features/timer/reminders';
import { bumpData } from '@/stores/dataVersion';

export type SubjectRow = { id: string; name: string; color: string };

export async function listSubjects(): Promise<SubjectRow[]> {
  const rows = await db
    .select({ id: subjects.id, name: subjects.name, color: subjects.color })
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

export async function setSubjectColor(id: string, color: string): Promise<void> {
  await db.update(subjects).set({ color, updatedAt: Date.now() }).where(eq(subjects.id, id));
  bumpData();
}

/**
 * Soft delete (sync-ready). Everything that belongs to the subject goes with it: its Planner tasks,
 * its scheduled Pomodoro sessions and its exam dates (study plans). Past focus time stays in statistics.
 */
export async function deleteSubject(id: string): Promise<void> {
  const now = Date.now();
  const gone = { deletedAt: now, updatedAt: now };
  await db.update(subjects).set(gone).where(eq(subjects.id, id));
  await db.update(plannedSessions).set(gone).where(and(eq(plannedSessions.subjectId, id), isNull(plannedSessions.deletedAt)));
  await db.update(tasks).set(gone).where(and(eq(tasks.subjectId, id), isNull(tasks.deletedAt)));
  await db.update(studyPlans).set(gone).where(and(eq(studyPlans.subjectId, id), isNull(studyPlans.deletedAt)));
  bumpData();
  void refreshSessionReminders();
}

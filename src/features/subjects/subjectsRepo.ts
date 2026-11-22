import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { plannedSessions, subjects } from '@/db/schema';
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

/** Soft delete (sync-ready). Also removes the subject's upcoming planned sessions. */
export async function deleteSubject(id: string): Promise<void> {
  const now = Date.now();
  await db.update(subjects).set({ deletedAt: now, updatedAt: now }).where(eq(subjects.id, id));
  await db
    .update(plannedSessions)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(plannedSessions.subjectId, id), isNull(plannedSessions.deletedAt)));
  bumpData();
}

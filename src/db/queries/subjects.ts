import { asc, isNull } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../id';
import { studyPlans, subjects } from '../schema';

export const subjectsQuery = () =>
  db.select().from(subjects).where(isNull(subjects.deletedAt)).orderBy(asc(subjects.sortOrder));

export async function addSubject(input: {
  name: string;
  color: string;
  difficulty: number;
  examDate?: number | null; // start of day, epoch ms
}) {
  const id = newId();
  const now = Date.now();
  const existing = await db.select({ id: subjects.id }).from(subjects).where(isNull(subjects.deletedAt));
  await db.insert(subjects).values({
    id,
    name: input.name,
    color: input.color,
    difficulty: input.difficulty,
    sortOrder: existing.length,
    updatedAt: now,
  });
  if (input.examDate != null) {
    await db.insert(studyPlans).values({ id: newId(), subjectId: id, examDate: input.examDate, updatedAt: now });
  }
  return id;
}

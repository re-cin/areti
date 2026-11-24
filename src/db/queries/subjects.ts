import { asc, isNull } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../id';
import { subjects } from '../schema';
import { bumpData } from '@/stores/dataVersion';

export const subjectsQuery = () =>
  db.select().from(subjects).where(isNull(subjects.deletedAt)).orderBy(asc(subjects.sortOrder));

export async function addSubject(input: {
  name: string;
  color: string;
}) {
  const id = newId();
  const now = Date.now();
  const existing = await db.select({ id: subjects.id }).from(subjects).where(isNull(subjects.deletedAt));
  await db.insert(subjects).values({
    id,
    name: input.name,
    color: input.color,
    sortOrder: existing.length,
    updatedAt: now,
  });
  bumpData();
  return id;
}

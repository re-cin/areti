import { startOfDay } from '@/lib/dates';
import { count } from 'drizzle-orm';
import { db } from './client';
import { newId } from './id';
import { subjects, tasks } from './schema';

/** Development data so screens are not empty. Does nothing if subjects already exist. Delete once Add Task works. */
export async function seedIfEmpty() {
  const [{ n }] = await db.select({ n: count() }).from(subjects);
  if (n > 0) return;

  const now = Date.now();
  const today = startOfDay(now);
  const physics = newId();
  const calculus = newId();
  const biology = newId();

  await db.insert(subjects).values([
    { id: physics, name: 'Physics', color: '#7B4FD6', sortOrder: 0, updatedAt: now },
    { id: calculus, name: 'Calculus', color: '#D0605E', sortOrder: 1, updatedAt: now },
    { id: biology, name: 'Biology', color: '#4FA66B', sortOrder: 2, updatedAt: now },
  ]);

  const t = (title: string, subjectId: string, startH: number, endH: number, done = false) => ({
    id: newId(),
    title,
    subjectId,
    date: today,
    startMinute: Math.round(startH * 60),
    endMinute: Math.round(endH * 60),
    done,
    updatedAt: now,
  });

  await db.insert(tasks).values([
    t('Physics Finals', physics, 10, 11),
    t('Calculus Prep & Limits', calculus, 14, 15),
    t('Chapter 1 - Cells', biology, 13, 14, true),
    t('Thermodynamics Problem Set', physics, 15, 15.75),
    t('Integration by Parts Drills', calculus, 16, 17.5),
    t('Genetics & DNA Lab Review', biology, 17, 18),
    t('Derivatives & Chain Rule', calculus, 19, 20, true),
  ]);
}

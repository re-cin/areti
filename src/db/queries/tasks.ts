import { and, asc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../id';
import { plannedSessions, tasks } from '../schema';
import { bumpData } from '@/stores/dataVersion';

/** Query builder for one day's tasks, sorted by start time. Pass it to useLiveQuery. */
export const tasksForDateQuery = (date: number) =>
  db
    .select()
    .from(tasks)
    .where(and(eq(tasks.date, date), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.startMinute));

export type Task = typeof tasks.$inferSelect;

export async function addTask(input: {
  title: string;
  subjectId: string;
  date: number;
  startMinute: number;
  endMinute: number;
  notificationSound?: string;
}) {
  const id = newId();
  await db.insert(tasks).values({ id, updatedAt: Date.now(), ...input });
  bumpData();
  return id;
}

export async function setTaskDone(id: string, done: boolean) {
  const now = Date.now();
  db.transaction(tx => {
    const task = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    tx.update(tasks).set({ done, updatedAt: now }).where(eq(tasks.id, id)).run();
    if (task?.source === 'generated') {
      const session = tx.select().from(plannedSessions).where(eq(plannedSessions.id, id)).get();
      if (session) tx.update(plannedSessions).set({ completedBlocks: done ? session.blocks : 0, updatedAt: now })
        .where(eq(plannedSessions.id, id)).run();
    }
  });
  bumpData();
}

export async function deleteTask(id: string) {
  const now = Date.now();
  db.transaction(tx => {
    tx.update(tasks).set({ deletedAt: now, updatedAt: now }).where(eq(tasks.id, id)).run();
    tx.update(plannedSessions).set({ deletedAt: now, updatedAt: now })
      .where(and(or(eq(plannedSessions.id, id), eq(plannedSessions.planId, `task:${id}`)), isNull(plannedSessions.deletedAt))).run();
  });
  bumpData();
}

/** Tasks between two days (inclusive). Used for the "has tasks" dots on the day strip. */
export const tasksInRangeQuery = (from: number, to: number) =>
  db
    .select({ date: tasks.date })
    .from(tasks)
    .where(and(gte(tasks.date, from), lte(tasks.date, to), isNull(tasks.deletedAt)));

/** Tasks between two days (inclusive) with what the month calendar's chips need, sorted by day then start time. */
export const taskChipsInRangeQuery = (from: number, to: number) =>
  db
    .select({ id: tasks.id, title: tasks.title, subjectId: tasks.subjectId, date: tasks.date, done: tasks.done })
    .from(tasks)
    .where(and(gte(tasks.date, from), lte(tasks.date, to), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.date), asc(tasks.startMinute));

export type TaskChip = { id: string; title: string; subjectId: string; date: number; done: boolean };

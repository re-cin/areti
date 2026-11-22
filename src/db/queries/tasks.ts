import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../id';
import { plannedSessions, tasks } from '../schema';
import { bumpData } from '@/stores/dataVersion';
import { refreshSessionReminders } from '@/features/timer/reminders';

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
  hasPomodoro?: boolean;
}) {
  const id = newId();
  await db.insert(tasks).values({ id, updatedAt: Date.now(), ...input });
  void refreshSessionReminders(); // 5-minute and start reminders with its Notification Sound
  return id;
}

export async function setTaskDone(id: string, done: boolean) {
  await db.update(tasks).set({ done, updatedAt: Date.now() }).where(eq(tasks.id, id));
  void refreshSessionReminders(); // a ticked task doesn't remind
}

export async function deleteTask(id: string) {
  const now = Date.now();
  await db.update(tasks).set({ deletedAt: now, updatedAt: now }).where(eq(tasks.id, id)); // soft delete
  // Its Pomodoro session (if scheduled) goes too, so it leaves Upcoming Sessions on every phone.
  await db
    .update(plannedSessions)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(plannedSessions.planId, `task:${id}`), isNull(plannedSessions.deletedAt)));
  bumpData();
  void refreshSessionReminders();
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

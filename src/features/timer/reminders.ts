import { and, asc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { loadPomodoroSettings } from './pomodoroSettings';
import { db } from '@/db/client';
import { plannedSessions, settings as settingsTable, subjects, tasks } from '@/db/schema';
import { formatClock, startOfDay } from '@/lib/dateHelpers';
import { scheduleSessionReminders, type SessionReminder } from './notifications';
import { usePreferences } from '@/features/preferences/preferencesStore';


/** How long before a scheduled Pomodoro session the reminder pops up. */
export const REMINDER_LEAD_MIN = 5;
const MAX_REMINDERS = 15; // sessions, 2 notifications each
const MAX_TASK_REMINDERS = 10; // plain tasks, 2 each (iOS allows 64 scheduled in total) // iOS keeps at most 64 scheduled notifications per app; leave room for the timer's

let pending: Promise<void> | null = null;
let again = false;

/**
 * Rebuilds every "Pomodoro in 5 minutes" reminder from the scheduled sessions on this phone
 * (today and later, not finished, not deleted). Call after sessions change, after a sync, and at start-up.
 * Safe to call often: calls made while one is running are merged into one more pass.
 */
export function refreshSessionReminders(): Promise<void> {
  if (pending) {
    again = true;
    return pending;
  }
  pending = (async () => {
    do {
      again = false;
      try {
        await scheduleSessionReminders(await buildReminders());
      } catch (e) {
        console.warn('[reminders]', e);
      }
    } while (again);
  })().finally(() => {
    pending = null;
  });
  return pending;
}

async function buildReminders(): Promise<SessionReminder[]> {
  const today = startOfDay(new Date()).getTime();
  const timeFormat = usePreferences.getState().preferences.timeFormat;
  const rows = await db
    .select({
      id: plannedSessions.id,
      date: plannedSessions.date,
      startMinute: plannedSessions.startMinute,
      subjectName: subjects.name,
      taskTitle: tasks.title,
      taskSound: tasks.notificationSound,
    })
    .from(plannedSessions)
    .innerJoin(subjects, sql`${subjects.id} = ${plannedSessions.subjectId}`)
    .leftJoin(tasks, sql`${plannedSessions.planId} = 'task:' || ${tasks.id}`)
    .where(
      and(
        gte(plannedSessions.date, today),
        isNull(plannedSessions.deletedAt),
        sql`${plannedSessions.excluded} = 0`,
        sql`${plannedSessions.completedBlocks} < ${plannedSessions.blocks}`,
        sql`${plannedSessions.startMinute} is not null`,
        sql`(${plannedSessions.planId} not like 'task:%' or (${tasks.id} is not null and ${tasks.deletedAt} is null))`,
      ),
    )
    .orderBy(asc(plannedSessions.date), asc(plannedSessions.startMinute))
    .limit(MAX_REMINDERS);

  // Sessions without a task use the notification sound they were scheduled with.
  const keys = rows.map((r) => `session.settings:${r.id}`);
  const frozen = keys.length ? await db.select().from(settingsTable).where(inArray(settingsTable.key, keys)) : [];
  const soundById = new Map<string, string>();
  const volumeById = new Map<string, number>();
  for (const f of frozen) {
    try {
      const s = JSON.parse(f.value) as { notificationSound?: string; notificationVolume?: number };
      const id = f.key.slice('session.settings:'.length);
      if (s.notificationSound) soundById.set(id, s.notificationSound);
      if (typeof s.notificationVolume === 'number') volumeById.set(id, s.notificationVolume);
    } catch {
      // ignore unreadable settings
    }
  }

  const sessionReminders: SessionReminder[] = rows.flatMap((r) => {
    const start = r.date + (r.startMinute ?? 0) * 60_000;
    // The task's Notification Sound (Add Task), else the sound the session was scheduled with.
    const sound = r.taskSound ?? soundById.get(r.id) ?? 'Singing Tibetan Bowl';
    const silent = sound === 'Silent';
    const volume = volumeById.get(r.id) ?? 80;
    return [
      {
        id: `${r.id}:before`,
        at: start - REMINDER_LEAD_MIN * 60_000,
        title: `Pomodoro in ${REMINDER_LEAD_MIN} minutes`,
        body: `Your session starts at ${formatClock(r.startMinute ?? 0, timeFormat)}. Get ready to focus!`,
        silent,
        sound,
        volume,
      },
      {
        // At the start time: opens the Pomodoro page (popup button, or tapping the notification).
        id: `${r.id}:start`,
        at: start,
        title: 'Time to focus',
        body: 'Your session is starting now.',
        silent,
        sound,
        volume,
        openPomodoro: true,
      },
    ];
  });

  // Plain Planner tasks (not scheduled as a Pomodoro) remind too, with their own Notification Sound.
  const plain = await db
    .select({ id: tasks.id, title: tasks.title, date: tasks.date, startMinute: tasks.startMinute, sound: tasks.notificationSound })
    .from(tasks)
    .where(and(gte(tasks.date, today), isNull(tasks.deletedAt), eq(tasks.done, false), eq(tasks.hasPomodoro, false)))
    .orderBy(asc(tasks.date), asc(tasks.startMinute))
    .limit(MAX_TASK_REMINDERS);
  const volume = (await loadPomodoroSettings()).notificationVolume;
  const taskReminders: SessionReminder[] = plain.flatMap((t) => {
    const start = t.date + t.startMinute * 60_000;
    const silent = t.sound === 'Silent';
    return [
      {
        id: `task:${t.id}:before`,
        at: start - REMINDER_LEAD_MIN * 60_000,
        title: `${t.title} in ${REMINDER_LEAD_MIN} minutes`,
        body: `Your task starts at ${formatClock(t.startMinute, timeFormat)}. Get ready!`,
        silent,
        sound: t.sound,
        volume,
      },
      {
        id: `task:${t.id}:start`,
        at: start,
        title: 'Time to start',
        body: `${t.title} is starting now.`,
        silent,
        sound: t.sound,
        volume,
      },
    ];
  });

  return [...sessionReminders, ...taskReminders];
}

import { and, asc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { focusSessions, plannedSessions, settings as settingsTable, studyPlans, subjects, tasks } from '@/db/schema';
import { startOfDay } from '@/lib/dateHelpers';
import { awardXp } from '@/features/pet/petRepo';
import { creditedMinutes, creditWithDailyCap } from '@/features/pet/xp';
import { bumpData } from '@/stores/dataVersion';
import { getSetting, setSetting } from '@/features/settings/settingsRepo';
import { DEFAULT_POMODORO, loadPomodoroSettings, type PomodoroSettings } from './pomodoroSettings';
import { refreshSessionReminders } from './reminders';

/** Sessions added by hand from the Pomodoro screen (not created by the planner engine). */
export const MANUAL_PLAN_ID = 'manual';

export async function isPlannedSessionActive(id: string): Promise<boolean> {
  const rows = await db.select({ id: plannedSessions.id }).from(plannedSessions)
    .where(and(eq(plannedSessions.id, id), isNull(plannedSessions.deletedAt))).limit(1);
  return rows.length > 0;
}

export type UpcomingSession = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  /** Planner task name, when the session came from "Schedule Pomodoro". */
  taskTitle: string | null;
  startMinute: number | null;
  blocks: number;
  completedBlocks: number;
  /** Pomodoro settings frozen when the session was scheduled (later settings changes don't touch it). */
  settings: PomodoroSettings;
};

// Each scheduled session keeps its own copy of the Pomodoro settings it was scheduled with.
const sessionSettingsKey = (plannedId: string) => `session.settings:${plannedId}`;

export async function freezeSessionSettings(plannedId: string, value: PomodoroSettings): Promise<void> {
  await setSetting(sessionSettingsKey(plannedId), value);
}

export async function getSessionSettings(plannedId: string): Promise<PomodoroSettings | null> {
  const saved = await getSetting<PomodoroSettings | null>(sessionSettingsKey(plannedId), null);
  return saved ? { ...DEFAULT_POMODORO, ...saved } : null;
}

/** Today's planned sessions that still have blocks left, earliest first. */
export async function listUpcomingToday(now = new Date()): Promise<UpcomingSession[]> {
  const today = startOfDay(now).getTime();
  const rows = await db
    .select({
      id: plannedSessions.id,
      subjectId: plannedSessions.subjectId,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      taskTitle: tasks.title,
      startMinute: plannedSessions.startMinute,
      blocks: plannedSessions.blocks,
      completedBlocks: plannedSessions.completedBlocks,
    })
    .from(plannedSessions)
    .innerJoin(subjects, eq(subjects.id, plannedSessions.subjectId))
    .leftJoin(tasks, or(eq(plannedSessions.id, tasks.id), sql`${plannedSessions.planId} = 'task:' || ${tasks.id}`))
    .leftJoin(studyPlans, eq(plannedSessions.planId, studyPlans.id))
    .where(
      and(
        eq(plannedSessions.date, today),
        isNull(plannedSessions.deletedAt),
        eq(plannedSessions.excluded, false),
        isNull(subjects.deletedAt),
        or(eq(plannedSessions.planId, MANUAL_PLAN_ID),
          and(sql`${plannedSessions.planId} LIKE 'task:%'`, sql`${tasks.id} IS NOT NULL`, isNull(tasks.deletedAt), eq(tasks.done, false)),
          and(sql`${studyPlans.id} IS NOT NULL`, isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'), gt(studyPlans.examDate, today))),
        sql`${plannedSessions.completedBlocks} < ${plannedSessions.blocks}`,
        // A session made from a Planner task goes away when that task is deleted.
        sql`(${plannedSessions.planId} not like 'task:%' or (${tasks.id} is not null and ${tasks.deletedAt} is null))`,
      ),
    )
    .orderBy(asc(plannedSessions.startMinute));

  // Attach each session's frozen settings. Older sessions without a copy get today's settings frozen now.
  const keys = rows.map((r) => sessionSettingsKey(r.id));
  const stored = keys.length ? await db.select().from(settingsTable).where(inArray(settingsTable.key, keys)) : [];
  const byKey = new Map(stored.map((s) => [s.key, s.value]));
  let current: PomodoroSettings | null = null;
  const out: UpcomingSession[] = [];
  for (const r of rows) {
    const raw = byKey.get(sessionSettingsKey(r.id));
    let frozen: PomodoroSettings;
    if (raw) {
      try {
        frozen = { ...DEFAULT_POMODORO, ...(JSON.parse(raw) as Partial<PomodoroSettings>) };
      } catch {
        frozen = current ??= await loadPomodoroSettings();
      }
    } else {
      frozen = current ??= await loadPomodoroSettings();
      await freezeSessionSettings(r.id, frozen);
    }
    out.push({ ...r, taskTitle: r.taskTitle ?? null, settings: frozen });
  }
  return out;
}

export async function addPlannedSession(input: { subjectId: string; startMinute: number; blocks: number; date?: Date }) {
  const id = newId();
  await freezeSessionSettings(id, await loadPomodoroSettings());
  await db.insert(plannedSessions).values({
    id,
    planId: MANUAL_PLAN_ID,
    subjectId: input.subjectId,
    date: startOfDay(input.date ?? new Date()).getTime(),
    startMinute: input.startMinute,
    blocks: input.blocks,
    locked: true, // the user placed it, the planner must not move it
    updatedAt: Date.now(),
  });
  bumpData();
  void refreshSessionReminders();
}

/**
 * "End session" on a scheduled session: it leaves Upcoming Sessions (and its reminders stop), but is
 * kept as a record, and the focus time already done stays in Statistics.
 */
export async function endPlannedSession(id: string) {
  await db.update(plannedSessions).set({ excluded: true, updatedAt: Date.now() }).where(eq(plannedSessions.id, id));
  await removeLinkedTask(id); // its Planner task is gone too (not moved to Finished)
  bumpData();
  void refreshSessionReminders();
}

/**
 * A session made from a Planner task ("Schedule Pomodoro") that is completed or ended: mark that task done,
 * so it moves from Daily Tasks to Finished (Pomodoro tasks have no tick box to do it by hand).
 */
async function linkedTaskId(plannedId: string) {
  const [p] = await db.select({ planId: plannedSessions.planId }).from(plannedSessions).where(eq(plannedSessions.id, plannedId));
  return p?.planId?.startsWith('task:') ? p.planId.slice('task:'.length) : null;
}

/** Ended early: the session's Planner task is deleted (soft, so it syncs). */
async function removeLinkedTask(plannedId: string) {
  const taskId = await linkedTaskId(plannedId);
  if (!taskId) return;
  const now = Date.now();
  await db.update(tasks).set({ deletedAt: now, updatedAt: now }).where(eq(tasks.id, taskId));
}

async function finishLinkedTask(plannedId: string) {
  const [p] = await db.select({ planId: plannedSessions.planId }).from(plannedSessions).where(eq(plannedSessions.id, plannedId));
  if (!p?.planId?.startsWith('task:')) return;
  const taskId = p.planId.slice('task:'.length);
  await db.update(tasks).set({ done: true, updatedAt: Date.now() }).where(eq(tasks.id, taskId));
}

export async function deletePlannedSession(id: string) {
  const now = Date.now();
  await db.update(plannedSessions).set({ deletedAt: now, updatedAt: now }).where(eq(plannedSessions.id, id));
  bumpData();
  void refreshSessionReminders();
}

/**
 * Saves a focus block, gives Reti its XP and, for planned sessions, counts the block.
 * Blocks shorter than a minute are ignored.
 */
export async function recordFocus(input: {
  subjectId: string | null;
  plannedSessionId: string | null;
  startedAt: number;
  durationSec: number;
  completed: boolean;
}) {
  if (input.durationSec < 60) return;
  // Credit already given today (for the ~10 hour daily cap), counted before this block is saved.
  const dayStart = startOfDay(new Date(input.startedAt)).getTime();
  const todays = await db
    .select({ durationSec: focusSessions.durationSec })
    .from(focusSessions)
    .where(and(isNull(focusSessions.deletedAt), sql`${focusSessions.startedAt} >= ${dayStart}`, sql`${focusSessions.startedAt} < ${dayStart + 86_400_000}`));
  const creditedToday = todays.reduce((a, r) => a + creditedMinutes(r.durationSec), 0);
  await db.insert(focusSessions).values({
    id: newId(),
    subjectId: input.subjectId,
    plannedSessionId: input.plannedSessionId,
    startedAt: input.startedAt,
    durationSec: Math.round(input.durationSec),
    completed: input.completed,
    updatedAt: Date.now(),
  });
  if (input.completed && input.plannedSessionId) {
    await db
      .update(plannedSessions)
      .set({ completedBlocks: sql`${plannedSessions.completedBlocks} + 1`, updatedAt: Date.now() })
      .where(eq(plannedSessions.id, input.plannedSessionId));
    // Last block done: the session is complete, so its Planner task moves to Finished.
    const [session] = await db.select().from(plannedSessions).where(eq(plannedSessions.id, input.plannedSessionId));
    if (session && session.completedBlocks >= session.blocks) {
      // Generated exam-plan task: same id as the planned session.
      await db.update(tasks).set({ done: true, updatedAt: Date.now() }).where(eq(tasks.id, session.id));
      // Manual task with a Pomodoro: linked through planId "task:<id>".
      await finishLinkedTask(session.id);
    }
  }
  // XP = credited minutes (whole minutes studied), finished or ended early, within the daily cap.
  await awardXp(creditWithDailyCap(input.durationSec, creditedToday));
  bumpData();
}

// ---------------------------------------------------------------- Planner tasks -> Pomodoro

/** Planned sessions made from a Planner task use this plan id, so each task has at most one. */
const taskPlanId = (taskId: string) => `task:${taskId}`;

export type TaskSummary = { title: string; subjectName: string; subjectColor: string; date: number; startMinute: number; endMinute: number };

export async function getTaskSummary(taskId: string): Promise<TaskSummary | null> {
  const [row] = await db
    .select({
      title: tasks.title,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      date: tasks.date,
      startMinute: tasks.startMinute,
      endMinute: tasks.endMinute,
    })
    .from(tasks)
    .innerJoin(subjects, eq(subjects.id, tasks.subjectId))
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
  return row ?? null;
}

/**
 * "Schedule Pomodoro" from Add Task: adds the task to Upcoming Sessions on its day and time.
 * Blocks = the task's length divided by the focus time (at least 1). Running it again updates it.
 */
export async function scheduleTaskPomodoro(taskId: string, chosen: PomodoroSettings): Promise<{ date: number } | null> {
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
  if (!task) return null;
  // Generated study tasks already have a Pomodoro. Never create a second task-linked copy.
  if (task.source === 'generated') {
    const [session] = await db.select().from(plannedSessions).where(and(eq(plannedSessions.id, task.id), isNull(plannedSessions.deletedAt)));
    if (!session || task.done || !task.planId) return null;
    const [plan] = await db.select().from(studyPlans).where(and(eq(studyPlans.id, task.planId), isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active')));
    const frozen = await getSessionSettings(session.id);
    if (frozen && (['focusCount', 'focusMin', 'breakMin', 'longBreakMin'] as const).some(key => frozen[key] !== chosen[key])) {
      throw new Error('Change this session’s Pomodoro settings in its Exam Study Plan so its study time stays consistent.');
    }
    return plan ? { date: task.date } : null;
  }
  const blocks = Math.max(1, Math.round((task.endMinute - task.startMinute) / Math.max(1, chosen.focusMin)));
  const now = Date.now();
  const values = { subjectId: task.subjectId, date: task.date, startMinute: task.startMinute, blocks, updatedAt: now };
  const [existing] = await db
    .select({ id: plannedSessions.id })
    .from(plannedSessions)
    .where(and(eq(plannedSessions.planId, taskPlanId(taskId)), isNull(plannedSessions.deletedAt)));
  const plannedId = existing?.id ?? newId();
  // This session keeps the settings chosen on the scheduling screen, whatever the global settings become later.
  await freezeSessionSettings(plannedId, chosen);
  if (existing) {
    await db.update(plannedSessions).set(values).where(eq(plannedSessions.id, plannedId));
  } else {
    await db.insert(plannedSessions).values({ id: plannedId, planId: taskPlanId(taskId), locked: true, ...values });
  }
  await db.update(tasks).set({ hasPomodoro: true, updatedAt: now }).where(eq(tasks.id, taskId));
  bumpData();
  void refreshSessionReminders();
  return { date: task.date };
}

import { and, asc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { focusSessions, plannedSessions, settings as settingsTable, studyPlans, subjects, tasks } from '@/db/schema';
import { startOfDay } from '@/lib/dateHelpers';
import { awardXp } from '@/features/pet/petRepo';
import { xpForFocus } from '@/features/pet/xp';
import { bumpData } from '@/stores/dataVersion';
import { getSetting, setSetting } from '@/features/settings/settingsRepo';
import { DEFAULT_POMODORO, loadPomodoroSettings, type PomodoroSettings } from './pomodoroSettings';

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
}

export async function deletePlannedSession(id: string) {
  const now = Date.now();
  await db.update(plannedSessions).set({ deletedAt: now, updatedAt: now }).where(eq(plannedSessions.id, id));
  bumpData();
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
    const [session] = await db.select().from(plannedSessions).where(eq(plannedSessions.id, input.plannedSessionId));
    if (session && session.completedBlocks >= session.blocks) {
      await db.update(tasks).set({ done: true, updatedAt: Date.now() }).where(eq(tasks.id, session.id));
    }
  }
  await awardXp(xpForFocus(input.durationSec, input.completed));
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
  return { date: task.date };
}

import { and, asc, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../id';
import { focusSessions, ghostState, settings, studyPlans } from '../schema';
import { clampGoal, focusStats, goalLock, goalLockText, needsGoalPrompt, nextGoalDay, type GoalDay, type GoalLock } from '@/features/pet';
import { startOfDay } from '@/lib/dates';
import { bumpData } from '@/stores/dataVersion';

// ---------------------------------------------------------------------------
// Reads (pass these to useLiveQuery)
// ---------------------------------------------------------------------------

/** Every logged focus block. EXP, level, streak and momentum are derived from these. */
export const focusLogQuery = () =>
  db
    .select({ startedAt: focusSessions.startedAt, durationSec: focusSessions.durationSec, completed: focusSessions.completed })
    .from(focusSessions)
    .where(isNull(focusSessions.deletedAt))
    .orderBy(asc(focusSessions.startedAt));

/** The nearest active exam on or after `today` (epoch ms of local midnight). */
export const nextExamQuery = (today: number) =>
  db
    .select({ examDate: studyPlans.examDate })
    .from(studyPlans)
    .where(and(isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'), gte(studyPlans.examDate, today)))
    .orderBy(asc(studyPlans.examDate))
    .limit(1);

/** The ghost's row (one per account; the newest wins if two phones each made one). */
export const ghostQuery = () =>
  db.select().from(ghostState).where(isNull(ghostState.deletedAt)).orderBy(desc(ghostState.updatedAt)).limit(1);

/** Keys the pet keeps in the `settings` table (values are JSON). */
export const PET_SETTINGS = {
  /** Daily goal in minutes, 60..420 in 30-minute steps (spec 3.2). */
  dailyGoal: 'pet.dailyGoalMinutes',
  /** Highest level the user has already seen the memory flash for. */
  lastLevelSeen: 'pet.lastLevelSeen',
  /** Local-midnight epoch ms of the last day the goal celebration played. */
  lastCelebrationDay: 'pet.lastCelebrationDay',
  /** Today's goal record ({ day, minutes, sets }): when it was asked for and how often it was set. */
  goalDay: 'pet.goalDay',
} as const;

export const petSettingsQuery = () =>
  db.select().from(settings).where(inArray(settings.key, Object.values(PET_SETTINGS)));

export const DEFAULT_DAILY_GOAL = 120;

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function renameGhost(name: string) {
  const now = Date.now();
  const [row] = await ghostQuery();
  if (row) await db.update(ghostState).set({ name, updatedAt: now }).where(eq(ghostState.id, row.id));
  else await db.insert(ghostState).values({ id: newId(), name, updatedAt: now });
}

export async function setPetSetting(key: (typeof PET_SETTINGS)[keyof typeof PET_SETTINGS], value: unknown) {
  const updatedAt = Date.now();
  const json = JSON.stringify(value);
  await db
    .insert(settings)
    .values({ key, value: json, updatedAt })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt } });
}

/** Spec 3.2: 1 to 7 hours in 30-minute steps. Today's progress recomputes automatically. */
export async function setDailyGoal(minutes: number) {
  await setPetSetting(PET_SETTINGS.dailyGoal, clampGoal(minutes));
}

export type GoalState = {
  /** Local midnight of today (epoch ms). */
  today: number;
  /** The current goal in minutes. */
  goalMinutes: number;
  /** Credited study minutes logged today. */
  minutesToday: number;
  /** Today's goal hasn't been asked for yet. */
  needsPrompt: boolean;
  /** Why Settings can't change it now (null = it can). */
  lock: GoalLock;
};

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) return fallback;
  try { return JSON.parse(row.value) as T; } catch { return fallback; }
}

/** The daily goal and whether it can be changed (see features/pet/goal.ts). */
export async function loadGoalState(now = Date.now()): Promise<GoalState> {
  const today = startOfDay(now);
  const saved = await readSetting<GoalDay | null>(PET_SETTINGS.goalDay, null);
  const goalMinutes = clampGoal(await readSetting<number>(PET_SETTINGS.dailyGoal, DEFAULT_DAILY_GOAL));
  const log = await focusLogQuery();
  const { minutesToday } = focusStats(log, now);
  return { today, goalMinutes, minutesToday, needsPrompt: needsGoalPrompt(saved, today), lock: goalLock(saved, today, minutesToday) };
}

/**
 * Sets today's goal: the daily question, or a change from Settings. Refused (with the reason) when
 * Settings tries to change it after study time was logged today or after the second set today.
 */
export async function saveTodayGoal(minutes: number, now = Date.now()): Promise<void> {
  const state = await loadGoalState(now);
  if (!state.needsPrompt && state.lock) throw new Error(goalLockText(state.lock) ?? 'The goal is locked today.');
  const saved = await readSetting<GoalDay | null>(PET_SETTINGS.goalDay, null);
  const next = nextGoalDay(saved, state.today, minutes);
  await setPetSetting(PET_SETTINGS.dailyGoal, next.minutes);
  await setPetSetting(PET_SETTINGS.goalDay, next);
  bumpData();
}

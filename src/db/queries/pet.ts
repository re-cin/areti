import { and, asc, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../id';
import { focusSessions, ghostState, settings, studyPlans } from '../schema';
import { DAILY_GOAL_KEY, DEFAULT_DAILY_GOAL_MIN, PREFERENCES_KEY } from '@/features/settings/preferences';

// ---------------------------------------------------------------------------
// Reads (pass these to useLiveQuery)
// ---------------------------------------------------------------------------

/** Every logged focus block. EXP, level, streak and momentum are derived from these. */
export const focusLogQuery = () =>
  db
    .select({ startedAt: focusSessions.startedAt, durationSec: focusSessions.durationSec })
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
  /** The one daily goal in minutes, shared with the Planner (set in Settings > Preferences). */
  dailyGoal: DAILY_GOAL_KEY,
  /** Settings > Preferences (Study Slots and sleep period). */
  preferences: PREFERENCES_KEY,
  /** Highest level the user has already seen the memory flash for. */
  lastLevelSeen: 'pet.lastLevelSeen',
  /** Local-midnight epoch ms of the last day the goal celebration played. */
  lastCelebrationDay: 'pet.lastCelebrationDay',
} as const;

export const petSettingsQuery = () =>
  db.select().from(settings).where(inArray(settings.key, Object.values(PET_SETTINGS)));

export const DEFAULT_DAILY_GOAL = DEFAULT_DAILY_GOAL_MIN;

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
  const clamped = Math.min(420, Math.max(60, Math.round(minutes / 30) * 30));
  // Same goal as the Planner; plans pick it up the next time they are rescheduled.
  await setPetSetting(PET_SETTINGS.dailyGoal, clamped);
}

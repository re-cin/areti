// Daily study goal rules (pure: no React Native or database, so it is easy to test).
//
// The goal is asked for the first time the app is opened each day. After that it can be changed in
// Settings › Preferences while no study time has been logged today, and at most twice a day in total
// (the morning answer counts as the first). Once study time is logged, it stays until tomorrow.

/** 1 to 7 hours in 30-minute steps (spec 3.2). */
export const GOAL_MIN = 60;
export const GOAL_MAX = 420;
export const GOAL_STEP = 30;
/** Times the goal can be set per day, the daily question included. */
export const MAX_GOAL_SETS_PER_DAY = 2;

/** Today's goal as saved: which day it belongs to, the minutes, and how many times it was set that day. */
export type GoalDay = { day: number; minutes: number; sets: number };

/** Why the goal can't be changed right now (null = it can). */
export type GoalLock = 'started' | 'limit' | null;

export function clampGoal(minutes: number): number {
  return Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(minutes / GOAL_STEP) * GOAL_STEP));
}

/** True when today's goal hasn't been asked for yet (`today` = local midnight, epoch ms). */
export function needsGoalPrompt(saved: GoalDay | null, today: number): boolean {
  return !saved || saved.day !== today;
}

/** Whether Settings may change today's goal. */
export function goalLock(saved: GoalDay | null, today: number, minutesToday: number): GoalLock {
  if (minutesToday > 0) return 'started';
  if (saved && saved.day === today && saved.sets >= MAX_GOAL_SETS_PER_DAY) return 'limit';
  return null;
}

/** The record to save when the goal is set to `minutes` today. */
export function nextGoalDay(saved: GoalDay | null, today: number, minutes: number): GoalDay {
  const sets = saved && saved.day === today ? saved.sets + 1 : 1;
  return { day: today, minutes: clampGoal(minutes), sets };
}

export function goalLockText(lock: GoalLock): string | null {
  if (lock === 'started') return 'Locked until tomorrow: you already started studying today.';
  if (lock === 'limit') return 'Locked until tomorrow: the goal can only be set twice a day.';
  return null;
}

/** 150 -> "2.5 hrs", 60 -> "1 hr" */
export function goalHoursText(minutes: number): string {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? 'hr' : 'hrs'}`;
}

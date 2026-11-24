// Reti for the admin site, worked out with the app's own pet code (src/features/pet), so the numbers here
// are exactly what the phone shows: credited minutes, the daily cap, the streak bonus, spec levels, momentum.
import { focusStats, momentumNow, type FocusRecord } from '../../../src/features/pet/focusLog';
import { DAILY_CREDIT_CEILING } from '../../../src/features/pet/credit';
import { LEVEL_THRESHOLDS, levelForExp, levelProgress, MAX_LEVEL } from '../../../src/features/pet/levels';
import { EXPRESSIONS } from '../../../src/features/pet/expressions';
import { resolveExpression } from '../../../src/features/pet/mood';
import { DEFAULT_SLEEP, inWindow } from '../../../src/features/pet/schedule';
import type { ExpressionId } from '../../../src/features/pet/types';

export const DEFAULT_DAILY_GOAL = 120;
const DAY = 86_400_000;

/** One focus-log row as the admin functions return it (snake_case, epoch ms). */
export type RetiSession = { started_at: number; duration_sec: number; completed: boolean; test?: boolean };

export type RetiDetail = {
  ghost: { name: string; level: number; xp: number; updated_at: number } | null;
  /** JSON text from the user's settings, or null (default goal). */
  daily_goal: string | null;
  sessions: RetiSession[];
};

export type RetiView = {
  name: string;
  level: number;
  maxLevel: boolean;
  totalExp: number;
  /** EXP inside the current level, and what the level needs (0 at max). */
  xp: number;
  xpToNext: number;
  progress: number;
  expToday: number;
  minutesToday: number;
  goalMinutes: number;
  streakDays: number;
  momentum: number;
  unlocked: string[];
  nextUnlock: { level: number; labels: string[] } | null;
  testBlocks: number;
  /** What the phone's ghost shows right now with no timer running (its mood), as the app picks it. */
  mood: ExpressionId;
};

const records = (sessions: RetiSession[]): FocusRecord[] =>
  sessions.map((s) => ({ startedAt: s.started_at, durationSec: s.duration_sec, completed: s.completed }));

export function goalOf(detail: RetiDetail): number {
  try {
    const n = Number(JSON.parse(detail.daily_goal ?? 'null'));
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_GOAL;
  } catch {
    return DEFAULT_DAILY_GOAL;
  }
}

export function retiView(detail: RetiDetail, now = Date.now()): RetiView {
  const log = records(detail.sessions);
  const stats = focusStats(log, now);
  const p = levelProgress(stats.totalExp);
  const start = LEVEL_THRESHOLDS[p.level - 1];
  const next = EXPRESSIONS.filter((e) => e.unlockLevel === p.level + 1);
  return {
    name: detail.ghost?.name ?? 'Reti',
    level: p.level,
    maxLevel: p.level >= MAX_LEVEL,
    totalExp: stats.totalExp,
    xp: stats.totalExp - start,
    xpToNext: p.nextLevelExp === null ? 0 : p.nextLevelExp - start,
    progress: p.progress,
    expToday: stats.expToday,
    minutesToday: stats.minutesToday,
    goalMinutes: goalOf(detail),
    streakDays: stats.streakDays,
    momentum: Math.round(momentumNow(log, now)),
    unlocked: EXPRESSIONS.filter((e) => e.unlockLevel <= p.level).map((e) => e.label),
    nextUnlock: p.level >= MAX_LEVEL ? null : { level: p.level + 1, labels: next.map((e) => e.label) },
    testBlocks: detail.sessions.filter((s) => s.test).length,
    // Exams aren't loaded here, so Nervous (exam in 3 days) isn't considered.
    mood: resolveExpression({
      level: p.level, momentum: momentumNow(log, now), minutesToday: stats.minutesToday, goalMinutes: goalOf(detail),
      session: 'idle', examInDays: null, isSleepPeriod: inWindow(now, DEFAULT_SLEEP), brief: null,
    }).id,
  };
}

/** A test block to add: it ends `endsAt` (default now). */
export type TestBlock = { started_at: number; duration_sec: number; completed: boolean };

export function testBlock(minutes: number, completed = true, endsAt = Date.now()): TestBlock {
  return { started_at: endsAt - minutes * 60_000, duration_sec: Math.round(minutes * 60), completed };
}

/** Just enough finished minutes today to reach the next level, or null (max level / today's 10 h cap). */
export function minutesToNextLevel(detail: RetiDetail, now = Date.now()): number | null {
  const log = records(detail.sessions);
  const level = levelForExp(focusStats(log, now).totalExp);
  if (level >= MAX_LEVEL) return null;
  const left = DAILY_CREDIT_CEILING - focusStats(log, now).minutesToday;
  for (let m = 1; m <= left; m++) {
    const trial = [...log, { startedAt: now - m * 60_000, durationSec: m * 60, completed: true }];
    if (levelForExp(focusStats(trial, now).totalExp) > level) return m;
  }
  return null;
}

/** Minutes still missing today to reach the daily goal. */
export function minutesToGoal(detail: RetiDetail, now = Date.now()): number {
  return Math.max(0, goalOf(detail) - focusStats(records(detail.sessions), now).minutesToday);
}

/** A finished 30-minute block on each of the last `days` days (today included) that has none yet. */
export function streakBlocks(detail: RetiDetail, days = 7, now = Date.now()): TestBlock[] {
  const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const today = dayStart(now);
  const out: TestBlock[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayStart(today - i * DAY + 12 * 3_600_000);
    if (detail.sessions.some((s) => s.completed && dayStart(s.started_at) === day)) continue;
    out.push(i === 0 ? testBlock(30, true, now) : testBlock(30, true, day + 10.5 * 3_600_000));
  }
  return out;
}

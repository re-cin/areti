import { EXPRESSIONS, type ExpressionInfo } from './expressions';

/**
 * Pacing constant (spec 7, open decision): multiply every threshold by 3 or 4
 * for longer-term use. 1 = the draft thresholds.
 */
export const LEVEL_SCALE = 1;

/** Total EXP needed to reach each level. Index 0 = Lv1. */
const BASE_THRESHOLDS = [0, 60, 180, 360, 600, 900, 1260, 1680] as const;

export const LEVEL_THRESHOLDS = BASE_THRESHOLDS.map((t) => t * LEVEL_SCALE);
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function levelForExp(totalExp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalExp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export type LevelProgress = {
  level: number;
  totalExp: number;
  /** Total EXP needed for the next level, or null at max level. */
  nextLevelExp: number | null;
  /** 0..1 progress through the current level. */
  progress: number;
};

export function levelProgress(totalExp: number): LevelProgress {
  const level = levelForExp(totalExp);
  const start = LEVEL_THRESHOLDS[level - 1];
  const next = level < MAX_LEVEL ? LEVEL_THRESHOLDS[level] : null;
  const progress = next === null ? 1 : (totalExp - start) / (next - start);
  return { level, totalExp, nextLevelExp: next, progress: Math.max(0, Math.min(1, progress)) };
}

/** The expressions unlocked at the next level, or null at max level. */
export function nextUnlock(level: number): { level: number; expressions: ExpressionInfo[] } | null {
  if (level >= MAX_LEVEL) return null;
  const next = level + 1;
  return { level: next, expressions: EXPRESSIONS.filter((e) => e.unlockLevel === next) };
}

/** Streak bonus (spec 7): +10% at a 3-day streak, +20% at 7 days. */
export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 7) return 1.2;
  if (streakDays >= 3) return 1.1;
  return 1;
}

/** EXP earned from credited minutes. 1 EXP per minute, whole numbers only. */
export function expForMinutes(creditedMinutes: number, streakDays = 0): number {
  return Math.floor(creditedMinutes * streakMultiplier(streakDays));
}

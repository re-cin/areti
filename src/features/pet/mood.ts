import { isUnlocked, withFallback } from './expressions';
import type {
  DisplayedExpression,
  ExpressionId,
  GoalBand,
  MatrixMood,
  MomentumBand,
  PetSituation,
} from './types';

/** An exam this many days away (or fewer) counts as "near". */
export const EXAM_NEAR_DAYS = 3;

/** Spec 3.1: Low 0-33, Decent 34-66, High 67-100. */
export function momentumBand(momentum: number): MomentumBand {
  if (momentum < 34) return 'low';
  if (momentum < 67) return 'decent';
  return 'high';
}

/** Credited minutes today / goal. 0 when there is no goal. */
export function goalProgress(minutesToday: number, goalMinutes: number): number {
  return goalMinutes > 0 ? minutesToday / goalMinutes : 0;
}

/** Spec 3.2: Low <40%, Middle 40-89%, High 90-124%, Over 125%+. */
export function goalBand(progress: number): GoalBand {
  if (progress < 0.4) return 'low';
  if (progress < 0.9) return 'middle';
  if (progress < 1.25) return 'high';
  return 'over';
}

/** Spec 3.3 mood outcome matrix: MATRIX[momentum][goal]. */
const MATRIX: Record<MomentumBand, Record<GoalBand, MatrixMood>> = {
  low: { low: 'sad', middle: 'neutral', high: 'neutral', over: 'tired' },
  decent: { low: 'neutral', middle: 'slightlyHappy', high: 'slightlyHappy', over: 'tired' },
  high: { low: 'slightlyHappy', middle: 'slightlyHappy', high: 'overjoyed', over: 'tired' },
};

export function matrixMood(momentum: number, progress: number): MatrixMood {
  return MATRIX[momentumBand(momentum)][goalBand(progress)];
}

export function isExamNear(examInDays: number | null): boolean {
  return examInDays !== null && examInDays >= 0 && examInDays <= EXAM_NEAR_DAYS;
}

/**
 * Picks what the ghost shows right now (spec 4 display priority, 5 tired resolution,
 * 6 fallbacks). Higher priorities override the base mood while their condition holds;
 * when they end, the ghost returns to the base mood.
 */
export function resolveExpression(s: PetSituation): DisplayedExpression {
  const progress = goalProgress(s.minutesToday, s.goalMinutes);
  const base = matrixMood(s.momentum, progress);
  const show = (id: ExpressionId): DisplayedExpression => ({ id: withFallback(id, s.level), base });

  // 1. Brief expressions.
  if (s.brief === 'goalCelebration') {
    // Locked celebration falls back to Neutral + confetti.
    return isUnlocked('goalCelebration', s.level)
      ? { id: 'goalCelebration', base }
      : { id: 'neutral', overlay: 'confetti', base };
  }
  if (s.brief === 'memoryFlash') return show('memoryFlash');

  // 2. Sleeping, only when no session is running.
  if (s.isSleepPeriod && s.session === 'idle') return show('sleeping');

  const examNear = isExamNear(s.examInDays);

  // 3. Tired family (goal at 125% or more).
  if (goalBand(progress) === 'over') {
    if (s.session === 'focus') return show('tiredFocus');
    if (s.session === 'idle' && examNear) return show('tiredNervous');
    return show('tired');
  }

  // 4. Timely expressions. A locked Nervous is skipped, so the base mood shows instead.
  if (s.session === 'focus') return show('focused');
  if (examNear && isUnlocked('nervous', s.level)) return show('nervous');

  // 5. Matrix mood (also what breaks show).
  return show(base);
}

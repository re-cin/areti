import type { ExpressionCategory, ExpressionId } from './types';

export type ExpressionInfo = {
  id: ExpressionId;
  /** Name shown in the app. Rename here only; ids stay stable. */
  label: string;
  category: ExpressionCategory;
  /** Level that unlocks it (1 = default). */
  unlockLevel: number;
  /** What it falls back to while locked; null = always available. */
  fallback: ExpressionId | null;
  /** Brief expressions play for this long, then the ghost returns to its base mood. */
  durationMs?: number;
};

/** Expression catalog (spec section 6). Order = order in the Expressions grid. */
export const EXPRESSIONS: readonly ExpressionInfo[] = [
  { id: 'neutral', label: 'Neutral', category: 'constant', unlockLevel: 1, fallback: null },
  { id: 'focused', label: 'Focused', category: 'timely', unlockLevel: 1, fallback: null },
  { id: 'sleeping', label: 'Sleeping', category: 'timely', unlockLevel: 1, fallback: null },
  { id: 'tired', label: 'Tired', category: 'constant', unlockLevel: 1, fallback: null },
  { id: 'memoryFlash', label: 'Memory flash', category: 'brief', unlockLevel: 1, fallback: null, durationMs: 3500 },
  { id: 'slightlyHappy', label: 'Slightly happy', category: 'constant', unlockLevel: 2, fallback: 'neutral' },
  { id: 'sad', label: 'Sad', category: 'constant', unlockLevel: 3, fallback: 'neutral' },
  { id: 'goalCelebration', label: 'Celebration', category: 'brief', unlockLevel: 4, fallback: 'neutral', durationMs: 4000 },
  { id: 'overjoyed', label: 'Overjoyed', category: 'constant', unlockLevel: 5, fallback: 'slightlyHappy' },
  // Locked Nervous doesn't fall back: the ghost shows its base mood (see resolveExpression).
  { id: 'nervous', label: 'Nervous', category: 'timely', unlockLevel: 6, fallback: null },
  { id: 'tiredFocus', label: 'Tired focus', category: 'timelyTired', unlockLevel: 7, fallback: 'tired' },
  { id: 'tiredNervous', label: 'Tired nervous', category: 'timelyTired', unlockLevel: 8, fallback: 'tired' },
];

const BY_ID = Object.fromEntries(EXPRESSIONS.map((e) => [e.id, e])) as Record<ExpressionId, ExpressionInfo>;

export function getExpression(id: ExpressionId): ExpressionInfo {
  return BY_ID[id];
}

export function isUnlocked(id: ExpressionId, level: number): boolean {
  return level >= BY_ID[id].unlockLevel;
}

/** Follows the fallback chain until it reaches an unlocked expression (spec 6). */
export function withFallback(id: ExpressionId, level: number): ExpressionId {
  let current = id;
  while (!isUnlocked(current, level)) {
    const next = BY_ID[current].fallback;
    if (!next) break;
    current = next;
  }
  return current;
}

export function unlockedExpressions(level: number): ExpressionInfo[] {
  return EXPRESSIONS.filter((e) => level >= e.unlockLevel);
}

// Types for the ghost pet. Rules live in docs: claude/ghost_system_spec.md (Areti project).

export type ExpressionId =
  | 'neutral'
  | 'tired'
  | 'slightlyHappy'
  | 'sad'
  | 'overjoyed'
  | 'memoryFlash'
  | 'goalCelebration'
  | 'focused'
  | 'sleeping'
  | 'nervous'
  | 'tiredFocus'
  | 'tiredNervous';

/** Spec section 6 "Category". */
export type ExpressionCategory = 'constant' | 'brief' | 'timely' | 'timelyTired';

/** Outcomes of the mood matrix (spec 3.3). */
export type MatrixMood = 'sad' | 'neutral' | 'slightlyHappy' | 'overjoyed' | 'tired';

export type MomentumBand = 'low' | 'decent' | 'high';
export type GoalBand = 'low' | 'middle' | 'high' | 'over';

/** What the Pomodoro timer is doing right now. */
export type SessionState = 'idle' | 'focus' | 'break';

/** Brief expressions that are queued to play once (spec 4, priority 1). */
export type BriefEvent = 'memoryFlash' | 'goalCelebration';

/** Everything the display logic needs to pick an expression. */
export type PetSituation = {
  level: number;
  momentum: number; // 0..100
  minutesToday: number; // credited minutes today
  goalMinutes: number; // daily goal
  session: SessionState;
  /** Days until the nearest exam, or null when none is scheduled. */
  examInDays: number | null;
  /** Inside the overnight sleep period. */
  isSleepPeriod: boolean;
  /** A brief expression currently playing, if any. */
  brief: BriefEvent | null;
};

/** Extra art layered on top of an expression (e.g. locked celebration fallback). */
export type Overlay = 'confetti';

export type DisplayedExpression = {
  id: ExpressionId;
  overlay?: Overlay;
  /** The matrix (base) mood underneath any override. */
  base: MatrixMood;
};

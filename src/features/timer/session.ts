// Pure Pomodoro state machine. No React, database or Expo imports, so it is easy to test.
//
// A "run" is a series of focus blocks with breaks between them:
//   focus -> break -> focus -> break ... and a long break after every `focusCount` blocks.
// The run ends right after its last focus block.

export type Phase = 'focus' | 'break' | 'longBreak';

export type TimerConfig = {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  /** Focus blocks before a long break. */
  focusCount: number;
};

export type Run = {
  phase: Phase;
  /** Focus blocks finished so far in this run. */
  completedBlocks: number;
  /** Focus blocks the run has in total. */
  totalBlocks: number;
};

export type PhaseEnd = {
  endedAt: number;
  ended: Run;
  /** The phase that starts next, or null when the run is over. */
  next: Run | null;
};

export function phaseMs(phase: Phase, cfg: TimerConfig): number {
  const min = phase === 'focus' ? cfg.focusMin : phase === 'break' ? cfg.breakMin : cfg.longBreakMin;
  return min * 60_000;
}

export function startRun(totalBlocks: number): Run {
  return { phase: 'focus', completedBlocks: 0, totalBlocks: Math.max(1, totalBlocks) };
}

/** The phase after `run` finishes, or null when the run is complete. */
export function nextRun(run: Run, cfg: TimerConfig): Run | null {
  if (run.phase !== 'focus') return { ...run, phase: 'focus' };
  const completedBlocks = run.completedBlocks + 1;
  if (completedBlocks >= run.totalBlocks) return null;
  const longBreak = cfg.focusCount > 0 && completedBlocks % cfg.focusCount === 0;
  return { ...run, completedBlocks, phase: longBreak ? 'longBreak' : 'break' };
}

/**
 * Moves through every phase that has already ended by `now` (e.g. after the app was in
 * the background). Each next phase starts exactly when the previous one ended.
 */
export function catchUp(
  run: Run,
  endsAt: number,
  cfg: TimerConfig,
  now: number,
): { run: Run | null; endsAt: number | null; ended: PhaseEnd[] } {
  const ended: PhaseEnd[] = [];
  let current: Run | null = run;
  let end = endsAt;
  while (current && now >= end) {
    const next = nextRun(current, cfg);
    ended.push({ endedAt: end, ended: current, next });
    current = next;
    if (next) end += phaseMs(next.phase, cfg);
  }
  return current ? { run: current, endsAt: end, ended } : { run: null, endsAt: null, ended };
}

/** Every future phase end of a running run (used to schedule notifications). */
export function projectTimeline(run: Run, endsAt: number, cfg: TimerConfig): PhaseEnd[] {
  const out: PhaseEnd[] = [];
  let current: Run | null = run;
  let end = endsAt;
  while (current && out.length < 64) {
    const next = nextRun(current, cfg);
    out.push({ endedAt: end, ended: current, next });
    current = next;
    if (next) end += phaseMs(next.phase, cfg);
  }
  return out;
}

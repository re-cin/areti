// Pure Pomodoro state machine. No React, database or Expo imports, so it is easy to test.
//
// Session structure:
// A session ("run") is a series of focus blocks (Focus count), all the same length (Focus time).
// A SHORT break comes between blocks, and ONE LONG break always comes last, after the final block.
//   1 block: F L   2: F S F L   3: F S F S F L   4: F S F S F S F L
// So: short breaks = blocks - 1 (none for 1 block), long breaks = always 1.

export type Phase = 'focus' | 'break' | 'longBreak';

/** Shortest focus block allowed. */
export const MIN_BLOCK_MIN = 5;

export type TimerConfig = {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  /** Number of focus blocks in a session. */
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

/** Focus minutes of a block (every block uses the Focus time), never under MIN_BLOCK_MIN. */
export function blockMin(cfg: TimerConfig, _index = 0): number {
  return Math.max(MIN_BLOCK_MIN, cfg.focusMin);
}

/** Length of a period (focus block, short break or long break). */
export function phaseMs(phase: Phase, cfg: TimerConfig, blockIndex = 0): number {
  const min = phase === 'focus' ? blockMin(cfg, blockIndex) : phase === 'break' ? cfg.breakMin : cfg.longBreakMin;
  return min * 60_000;
}


/** Planned focus minutes of a whole session. */
export function sessionFocusMin(cfg: TimerConfig, blocks = cfg.focusCount): number {
  let total = 0;
  for (let i = 0; i < blocks; i++) total += blockMin(cfg, i);
  return total;
}

/** Short and long breaks in a session of `blocks` blocks. */
export function breakCounts(blocks: number): { short: number; long: number } {
  return { short: Math.max(0, blocks - 1), long: 1 };
}

/** Total session length = focus times + short breaks × break time + long breaks × long break time. */
export function sessionLengthMin(cfg: TimerConfig, blocks = cfg.focusCount): number {
  const { short, long } = breakCounts(blocks);
  return sessionFocusMin(cfg, blocks) + short * cfg.breakMin + long * cfg.longBreakMin;
}

export function startRun(totalBlocks: number): Run {
  return { phase: 'focus', completedBlocks: 0, totalBlocks: Math.max(1, totalBlocks) };
}

/** The phase after `run` finishes, or null when the run is complete. */
export function nextRun(run: Run, _cfg?: TimerConfig): Run | null {
  // The final long break (all blocks done) ends the session.
  if (run.phase === 'longBreak') return null;
  // A short break leads to the next block.
  if (run.phase === 'break') return { ...run, phase: 'focus' };
  // A focus block ends: a short break before the next block, or the long break after the last one.
  const completedBlocks = run.completedBlocks + 1;
  return { ...run, completedBlocks, phase: completedBlocks >= run.totalBlocks ? 'longBreak' : 'break' };
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
  /** Stop when a break ends: the next focus block waits for the user to press play. */
  waitAfterBreak = false,
): { run: Run | null; endsAt: number | null; ended: PhaseEnd[]; waiting?: boolean } {
  const ended: PhaseEnd[] = [];
  let current: Run | null = run;
  let end = endsAt;
  while (current && now >= end) {
    const next = nextRun(current, cfg);
    ended.push({ endedAt: end, ended: current, next });
    if (waitAfterBreak && current.phase !== 'focus' && next) {
      return { run: next, endsAt: null, ended, waiting: true };
    }
    current = next;
    if (next) end += phaseMs(next.phase, cfg, next.completedBlocks);
  }
  return current ? { run: current, endsAt: end, ended } : { run: null, endsAt: null, ended };
}

/** Every future phase end of a running run (used to schedule notifications). */
export function projectTimeline(run: Run, endsAt: number, cfg: TimerConfig, waitAfterBreak = false): PhaseEnd[] {
  const out: PhaseEnd[] = [];
  let current: Run | null = run;
  let end = endsAt;
  while (current && out.length < 64) {
    const next = nextRun(current, cfg);
    out.push({ endedAt: end, ended: current, next });
    if (waitAfterBreak && current.phase !== 'focus') break; // the run pauses here until play is pressed
    current = next;
    if (next) end += phaseMs(next.phase, cfg, next.completedBlocks);
  }
  return out;
}

// Planner constants and helpers. Pure TypeScript: NO imports from Expo or React Native here,
// so this logic is easy to test and can move to any setup later.
export const FOCUS_BLOCK_MIN = 25;
export const SHORT_BREAK_MIN = 5;
export const LONG_BREAK_MIN = 30; // minimum length of the long break
export const MAX_CONTINUOUS_STUDY_MIN = 120; // at most 2 hours of focus before a long break

/** Stored difficulty 1/3/5 (Low/Medium/High) gets study-time weights 1/2/3. */
export function difficultyWeight(difficulty: number): number {
  const value = Number.isFinite(difficulty) ? Math.min(5, Math.max(1, difficulty)) : 3;
  return 1 + (value - 1) / 2;
}

/** Most focus blocks allowed in one run before a long break is required. */
export const maxBlocksPerRun = (blockMin = FOCUS_BLOCK_MIN) =>
  Math.max(1, Math.floor(MAX_CONTINUOUS_STUDY_MIN / blockMin));

/**
 * Split a number of focus blocks into runs, each short enough to respect the
 * "2 hours then a 30 minute break" rule. Example (25 min blocks): 9 blocks -> [4, 4, 1].
 */
export function splitIntoRuns(blocks: number, blockMin = FOCUS_BLOCK_MIN): number[] {
  const max = maxBlocksPerRun(blockMin);
  const runs: number[] = [];
  let left = Math.max(0, Math.floor(blocks));
  while (left > 0) {
    const run = Math.min(max, left);
    runs.push(run);
    left -= run;
  }
  return runs;
}

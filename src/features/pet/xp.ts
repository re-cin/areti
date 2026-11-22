// XP rules for Reti. Pure functions, shared by the timer (awarding) and statistics (display).

// Core rule: every ghost feature runs from CREDITED focus minutes.
//  - A focus block is credited with the whole minutes actually focused (rounded down), only if that is
//    15 or more; under 15 minutes gives 0.
//  - Credit is applied when the block ends, whether it completed or was cancelled.
//  - Guard: at most DAILY_CREDIT_CAP_MIN credited minutes per day (about 10 hours).
// 1 credited minute = 1 XP.

export const MIN_CREDITED_MIN = 15;
export const DAILY_CREDIT_CAP_MIN = 600;

/** Credited minutes for one focus block: whole minutes, 0 under 15. (25 done -> 25, 40 -> 40, 15 -> 15, 14 -> 0) */
export function creditedMinutes(durationSec: number): number {
  const min = Math.floor(durationSec / 60);
  return min >= MIN_CREDITED_MIN ? min : 0;
}

/** Credit actually given for a block, after the daily cap (`creditedToday` = already credited that day). */
export function creditWithDailyCap(durationSec: number, creditedToday: number): number {
  return Math.min(creditedMinutes(durationSec), Math.max(0, DAILY_CREDIT_CAP_MIN - creditedToday));
}

/** XP for one focus block = its credited minutes (completed or cancelled doesn't matter). */
export function xpForFocus(durationSec: number, _completed?: boolean): number {
  return creditedMinutes(durationSec);
}

/** XP needed to go from `level` to the next level (Lv 4 needs 500). */
export function xpToNextLevel(level: number): number {
  return 100 * (level + 1);
}

/** Adds XP, levelling up as many times as needed. `xp` is progress inside the current level. */
export function addXp(level: number, xp: number, gained: number): { level: number; xp: number } {
  let l = level;
  let x = xp + Math.max(0, gained);
  while (x >= xpToNextLevel(l)) {
    x -= xpToNextLevel(l);
    l += 1;
  }
  return { level: l, xp: x };
}

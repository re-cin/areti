// XP rules for Reti, shared by the timer (awarding), Pomodoro, Statistics and the Reti tab.
// One source: the pet module (credit.ts, levels.ts, focusLog.ts). This file only adapts it for
// callers that work in seconds.
//  - A focus block is credited with the whole minutes actually focused (rounded down), whether it ran to
//    the end or was ended early.
//  - At most DAILY_CREDIT_CAP_MIN credited minutes per day (about 10 hours).
//  - EXP = credited minutes x streak bonus (x1.1 from a 3-day streak, x1.2 from 7). The streak counts days
//    with at least one finished focus block, of any length.
//  - Levels use the spec thresholds (levels.ts), the same on every tab.
import { applyDailyCeiling, creditedMinutes as creditedFromMinutes, DAILY_CREDIT_CEILING, MIN_CREDITED_MINUTES } from './credit';

export const MIN_CREDITED_MIN = MIN_CREDITED_MINUTES;
export const DAILY_CREDIT_CAP_MIN = DAILY_CREDIT_CEILING;

/** Credited minutes for one focus block: whole minutes studied. (25 done -> 25, ended at 12:40 -> 12) */
export function creditedMinutes(durationSec: number): number {
  return creditedFromMinutes(durationSec / 60);
}

/** Credit actually given for a block, after the daily cap (`creditedToday` = already credited that day). */
export function creditWithDailyCap(durationSec: number, creditedToday: number): number {
  return applyDailyCeiling(creditedToday, creditedMinutes(durationSec));
}

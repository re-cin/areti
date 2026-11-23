import { applyDailyCeiling, creditedMinutes, decayMomentum, gainMomentum, MOMENTUM_START } from './credit';
import { expForMinutes } from './levels';
import { DEFAULT_STUDY_SLOTS, minutesInSlots, type TimeWindow } from './schedule';

/** The parts of a `focus_sessions` row the ghost needs. */
export type FocusRecord = { startedAt: number; durationSec: number };

const dayOf = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const prevDay = (day: number) => {
  const d = new Date(day);
  d.setDate(d.getDate() - 1);
  return dayOf(d.getTime());
};

export type FocusStats = {
  totalExp: number;
  expToday: number;
  /** Credited minutes today (after the 15-minute rule and the daily ceiling). */
  minutesToday: number;
  /** Consecutive days with at least one credited block, ending today (or yesterday). */
  streakDays: number;
};

/**
 * Everything level/goal related, derived from the focus log. Nothing here is stored,
 * so two phones syncing the same sessions always agree.
 */
export function focusStats(records: readonly FocusRecord[], now: number): FocusStats {
  // Credited minutes per day (spec 1), capped by the daily ceiling.
  const perDay = new Map<number, number>();
  for (const r of [...records].sort((a, b) => a.startedAt - b.startedAt)) {
    const credit = creditedMinutes(r.durationSec / 60);
    if (credit === 0) continue;
    const day = dayOf(r.startedAt);
    const sofar = perDay.get(day) ?? 0;
    perDay.set(day, sofar + applyDailyCeiling(sofar, credit));
  }

  // EXP per day with that day's streak bonus (spec 7).
  const streakAt = (day: number) => {
    let n = 0;
    for (let d = day; perDay.has(d); d = prevDay(d)) n++;
    return n;
  };
  let totalExp = 0;
  let expToday = 0;
  const today = dayOf(now);
  for (const [day, minutes] of perDay) {
    const exp = expForMinutes(minutes, streakAt(day));
    totalExp += exp;
    if (day === today) expToday = exp;
  }

  const streakDays = perDay.has(today) ? streakAt(today) : streakAt(prevDay(today));
  return { totalExp, expToday, minutesToday: perDay.get(today) ?? 0, streakDays };
}

/**
 * Momentum now (spec 3.1), replayed from the focus log: starts at 50, +0.4 per credited
 * minute when a block ends, -0.2 per idle minute inside Study Slots. Time inside a session
 * is not idle. Breaks aren't logged yet, so they count as idle for now.
 */
export function momentumNow(
  records: readonly FocusRecord[],
  now: number,
  slots: readonly TimeWindow[] = DEFAULT_STUDY_SLOTS,
): number {
  const sorted = [...records].sort((a, b) => a.startedAt - b.startedAt);
  let m = MOMENTUM_START;
  let cursor: number | null = null; // decay only starts after the first session
  for (const r of sorted) {
    const end = r.startedAt + r.durationSec * 1000;
    if (cursor !== null && r.startedAt > cursor) m = decayMomentum(m, minutesInSlots(cursor, r.startedAt, slots));
    m = gainMomentum(m, creditedMinutes(r.durationSec / 60));
    cursor = Math.max(cursor ?? end, end);
  }
  if (cursor !== null && now > cursor) m = decayMomentum(m, minutesInSlots(cursor, now, slots));
  return m;
}

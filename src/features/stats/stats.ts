// Pure statistics math. Input: focus sessions; output: numbers the Statistics screen shows.
import { addDays, dayKey, daysBetween, startOfDay, startOfMonth, startOfWeek } from '@/lib/dateHelpers';
import { xpForFocus } from '@/features/pet/xp';

export type StatSession = {
  startedAt: number;
  durationSec: number;
  completed: boolean;
  subjectId: string | null;
};

export type Period = 'week' | 'month' | 'all';

/** Focus minutes per local day ('YYYY-MM-DD'). */
export function minutesByDay(sessions: StatSession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    map.set(k, (map.get(k) ?? 0) + s.durationSec / 60);
  }
  return map;
}

/** Heatmap level 0 (nothing) .. 4 (2 hours or more). */
export function intensityLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

/**
 * Current streak: consecutive study days ending today (or yesterday, so the streak is not
 * "lost" before the user had a chance to study today). Peak: the longest run ever.
 */
export function streaks(studyDays: Set<string>, today: Date): { current: number; peak: number } {
  let start = startOfDay(today);
  if (!studyDays.has(dayKey(start))) start = addDays(start, -1);
  let current = 0;
  for (let d = start; studyDays.has(dayKey(d)); d = addDays(d, -1)) current += 1;

  let peak = 0;
  for (const k of studyDays) {
    const [y, m, d] = k.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (studyDays.has(dayKey(addDays(date, -1)))) continue; // not the start of a run
    let len = 0;
    for (let x = date; studyDays.has(dayKey(x)); x = addDays(x, 1)) len += 1;
    peak = Math.max(peak, len);
  }
  return { current, peak: Math.max(peak, current) };
}

export type DaySummary = { minutes: number; sessions: number; xp: number };

export function daySummary(sessions: StatSession[], day: Date): DaySummary {
  const k = dayKey(day);
  const mine = sessions.filter((s) => dayKey(s.startedAt) === k);
  return {
    minutes: mine.reduce((a, s) => a + s.durationSec / 60, 0),
    sessions: mine.length,
    xp: mine.reduce((a, s) => a + xpForFocus(s.durationSec, s.completed), 0),
  };
}

export type PeriodSummary = {
  totalMin: number;
  sessions: number;
  dailyAvgMin: number;
  /** Monday..Sunday. Week: minutes that day. Month / all time: average per weekday. */
  bars: number[];
  barsAreAverages: boolean;
  range: { start: Date; end: Date }; // end is exclusive
};

/**
 * Summary for the period around `anchor` (the selected day / shown month).
 * Days after `today` are not counted in averages.
 */
export function periodSummary(sessions: StatSession[], period: Period, anchor: Date, today: Date): PeriodSummary {
  let start: Date;
  let end: Date;
  if (period === 'week') {
    start = startOfWeek(anchor);
    end = addDays(start, 7);
  } else if (period === 'month') {
    start = startOfMonth(anchor);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  } else {
    const first = sessions.reduce((min, s) => Math.min(min, s.startedAt), Number.POSITIVE_INFINITY);
    start = Number.isFinite(first) ? startOfDay(first) : startOfDay(today);
    end = addDays(startOfDay(today), 1);
  }

  const inRange = sessions.filter((s) => s.startedAt >= start.getTime() && s.startedAt < end.getTime());
  const totalMin = inRange.reduce((a, s) => a + s.durationSec / 60, 0);

  // Days that have happened so far inside the range.
  const lastCounted = new Date(Math.min(addDays(end, -1).getTime(), startOfDay(today).getTime()));
  const elapsedDays = Math.max(0, daysBetween(start, lastCounted) + 1);

  const perWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const s of inRange) perWeekday[(new Date(s.startedAt).getDay() + 6) % 7] += s.durationSec / 60;

  let bars = perWeekday;
  const barsAreAverages = period !== 'week';
  if (barsAreAverages) {
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < elapsedDays; i++) weekdayCounts[(addDays(start, i).getDay() + 6) % 7] += 1;
    bars = perWeekday.map((m, i) => (weekdayCounts[i] ? m / weekdayCounts[i] : 0));
  }

  return {
    totalMin,
    sessions: inRange.length,
    dailyAvgMin: elapsedDays > 0 ? totalMin / elapsedDays : 0,
    bars,
    barsAreAverages,
    range: { start, end },
  };
}

/** Minutes per subject inside a range, biggest first. `null` = no subject. */
export function subjectTotals(sessions: StatSession[], range: { start: Date; end: Date }) {
  const map = new Map<string | null, number>();
  for (const s of sessions) {
    if (s.startedAt < range.start.getTime() || s.startedAt >= range.end.getTime()) continue;
    map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.durationSec / 60);
  }
  return [...map.entries()].map(([subjectId, minutes]) => ({ subjectId, minutes })).sort((a, b) => b.minutes - a.minutes);
}

// Time windows the ghost cares about.
// PLACEHOLDERS until the app has these settings (spec 3.1 Study Slots, spec 11 Sleep period).

/** Minutes from midnight. `end` may be past midnight (e.g. 23:00 -> 07:00). */
export type TimeWindow = { start: number; end: number };

/**
 * Until Study Slots exist: assume one evening slot, 18:00-21:00 every day.
 * Note the spec's decay (-12 per idle hour) makes long slots drain momentum fast:
 * a 12-hour slot costs up to -144 a day against +24 for an hour of study.
 */
export const DEFAULT_STUDY_SLOTS: readonly TimeWindow[] = [{ start: 18 * 60, end: 21 * 60 }];

/** Suggested default sleep period from the spec: 11pm to 7am. */
export const DEFAULT_SLEEP: TimeWindow = { start: 23 * 60, end: 7 * 60 };

const MINUTE = 60_000;

const minuteOfDay = (ms: number) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

const midnight = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const nextMidnight = (ms: number) => {
  const d = new Date(ms);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};

/** True when `ms` falls inside the window (handles windows that cross midnight). */
export function inWindow(ms: number, w: TimeWindow): boolean {
  const m = minuteOfDay(ms);
  return w.start <= w.end ? m >= w.start && m < w.end : m >= w.start || m < w.end;
}

/** Whole minutes between `from` and `to` that fall inside any of the daily slots. */
export function minutesInSlots(from: number, to: number, slots: readonly TimeWindow[]): number {
  if (to <= from) return 0;
  let total = 0;
  for (let day = midnight(from); day < to; day = nextMidnight(day)) {
    for (const slot of slots) {
      // Same-day slots only; Study Slots are daytime windows.
      const a = Math.max(from, day + slot.start * MINUTE);
      const b = Math.min(to, day + slot.end * MINUTE);
      if (b > a) total += (b - a) / MINUTE;
    }
  }
  return Math.floor(total);
}

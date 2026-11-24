// Time windows the ghost cares about: Study Slots (spec 3.1) and the sleep period (spec 11).
// The real values come from Settings > Preferences; the defaults below are only fallbacks.

/** Minutes from midnight. `end` may be past midnight (e.g. 23:00 -> 07:00). */
export type TimeWindow = { start: number; end: number };
/** Same-day windows for each weekday (index = Date.getDay()). */
export type WeeklySlots = readonly (readonly TimeWindow[])[];

/**
 * Fallback when no Study Slots are saved: one evening slot, 18:00-21:00 every day.
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

/** Splits windows that cross midnight into same-day pieces: [start, 1440) today and [0, end) tomorrow. */
const pieces = (w: TimeWindow) => (w.start <= w.end ? { today: [w], tomorrow: [] as TimeWindow[] }
  : { today: [{ start: w.start, end: 1440 }], tomorrow: w.end > 0 ? [{ start: 0, end: w.end }] : [] });

/** Removes `cut` from each window. */
function subtract(windows: TimeWindow[], cut: TimeWindow[]): TimeWindow[] {
  let out = windows;
  for (const c of cut) {
    out = out.flatMap((w) => {
      if (c.end <= w.start || c.start >= w.end) return [w];
      return [{ start: w.start, end: c.start }, { start: c.end, end: w.end }].filter((x) => x.end > x.start);
    });
  }
  return out;
}

/**
 * Study Slots per weekday (from Preferences) turned into same-day windows, minus the sleep
 * period, so momentum never drains while the user is meant to be asleep.
 */
export function weeklyWindows(perWeekday: readonly (TimeWindow | null)[], sleep?: TimeWindow): TimeWindow[][] {
  const days: TimeWindow[][] = Array.from({ length: 7 }, () => []);
  perWeekday.forEach((slot, weekday) => {
    if (!slot || slot.start === slot.end) return;
    const p = pieces(slot);
    days[weekday].push(...p.today);
    days[(weekday + 1) % 7].push(...p.tomorrow);
  });
  if (!sleep || sleep.start === sleep.end) return days;
  const s = pieces(sleep);
  return days.map((windows) => subtract(windows, [...s.today, ...s.tomorrow]));
}

/** Whole minutes between `from` and `to` that fall inside the slots (flat: every day; weekly: per weekday). */
export function minutesInSlots(from: number, to: number, slots: readonly TimeWindow[] | WeeklySlots): number {
  if (to <= from) return 0;
  const weekly = slots.length > 0 && Array.isArray(slots[0]);
  let total = 0;
  for (let day = midnight(from); day < to; day = nextMidnight(day)) {
    const daySlots = (weekly ? (slots as WeeklySlots)[new Date(day).getDay()] ?? [] : slots) as readonly TimeWindow[];
    for (const slot of daySlots) {
      // Same-day slots only; Study Slots are daytime windows.
      const a = Math.max(from, day + slot.start * MINUTE);
      const b = Math.min(to, day + slot.end * MINUTE);
      if (b > a) total += (b - a) / MINUTE;
    }
  }
  return Math.floor(total);
}

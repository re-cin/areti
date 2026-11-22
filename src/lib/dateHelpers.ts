// Small date helpers. All dates are LOCAL time (the user's day), never UTC.

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date | number): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const mondayOffset = (x.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
  return addDays(x, -mondayOffset);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 'YYYY-MM-DD' in local time. */
export function dayKey(d: Date | number): string {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

/** Whole days from a to b (both normalised to the start of their day). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** 42 days (6 weeks, Monday first) covering the month of `d`. */
export function monthGrid(d: Date): Date[] {
  const first = startOfWeek(startOfMonth(d));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Minutes from midnight -> '9:00 AM'. */
export function formatClock(minuteOfDay: number): string {
  const h24 = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** Milliseconds -> '23:49' (or '1:02:03' past an hour). */
export function formatTimer(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Minutes -> '23h 30m' / '47m'. */
export function formatHM(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return `${h}h ${r}m`;
}

/** Minutes -> '1 hr 45 mins' / '2 hrs' / '30 mins'. */
export function formatLongDuration(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const r = m % 60;
  const hPart = h > 0 ? `${h} ${h === 1 ? 'hr' : 'hrs'}` : '';
  const mPart = r > 0 || h === 0 ? `${r} ${r === 1 ? 'min' : 'mins'}` : '';
  return [hPart, mPart].filter(Boolean).join(' ');
}

/** Minutes -> '3.2h' for chart labels ('45m' under an hour, '' for zero). */
export function formatChartLabel(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

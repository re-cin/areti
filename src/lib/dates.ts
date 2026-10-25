/** Epoch ms of local midnight for the given date. All "date" columns store this value. */
export const startOfDay = (d: Date | number) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
export const addDays = (ms: number, n: number) => {
  const x = new Date(ms);
  x.setDate(x.getDate() + n); // setDate handles daylight saving, unlike adding 24h
  return startOfDay(x);
};

/** Start of the week containing `ms`. weekStartsOn: 0 = Sunday, 1 = Monday (match the "first day of week" setting). */
export const startOfWeek = (ms: number, weekStartsOn = 1) => {
  const d = new Date(ms);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(startOfDay(d), -diff);
};

/** The 7 days (epoch ms of local midnight) of the week starting at `weekStart`. */
export const weekDays = (weekStart: number) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "September Week 3". Uses the 4th day of the week, so a week split across two months gets one clear label. */
export function weekLabel(weekStart: number): string {
  const mid = new Date(addDays(weekStart, 3));
  return `${MONTHS[mid.getMonth()]} Week ${Math.ceil(mid.getDate() / 7)}`;
}

export const sameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

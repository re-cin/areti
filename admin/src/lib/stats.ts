import type { UserDetail } from './types';

// The same math as the app's Statistics tab (src/features/stats/stats.ts),
// worked out in the admin's local time zone.

type Session = UserDetail['sessions'][number];
const DAY = 86_400_000;

export function startOfDay(t: number | Date) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function dayKey(t: number | Date) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function minutesByDay(sessions: Session[]) {
  const map = new Map<string, number>();
  for (const s of sessions) map.set(dayKey(s.started_at), (map.get(dayKey(s.started_at)) ?? 0) + s.duration_sec / 60);
  return map;
}

/** Current streak (ending today or yesterday) and the longest streak ever. */
export function streaks(studyDays: Set<string>, today = new Date()) {
  let start = startOfDay(today);
  if (!studyDays.has(dayKey(start))) start = addDays(start, -1);
  let current = 0;
  for (let d = start; studyDays.has(dayKey(d)); d = addDays(d, -1)) current += 1;
  let peak = 0;
  for (const k of studyDays) {
    const [y, m, d] = k.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (studyDays.has(dayKey(addDays(date, -1)))) continue;
    let len = 0;
    for (let x = date; studyDays.has(dayKey(x)); x = addDays(x, 1)) len += 1;
    peak = Math.max(peak, len);
  }
  return { current, peak: Math.max(peak, current) };
}

/** Last `days` days, oldest first, in the shape the bar chart takes. */
export function dailySeries(byDay: Map<string, number>, days: number, today = new Date()) {
  const start = addDays(startOfDay(today), -(days - 1));
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i);
    return { day: dayKey(d), signups: 0, focus_minutes: Math.round(byDay.get(dayKey(d)) ?? 0) };
  });
}

/** Heatmap level 0 (nothing) .. 4 (2 hours or more), same thresholds as the app. */
export function intensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

/** Average minutes per weekday, Monday first, over the days since the first session. */
export function weekdayAverages(sessions: Session[], today = new Date()) {
  if (!sessions.length) return [0, 0, 0, 0, 0, 0, 0];
  const first = startOfDay(sessions[0].started_at);
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) totals[(new Date(s.started_at).getDay() + 6) % 7] += s.duration_sec / 60;
  for (let d = first; d <= today; d = addDays(d, 1)) counts[(d.getDay() + 6) % 7] += 1;
  return totals.map((t, i) => (counts[i] ? t / counts[i] : 0));
}

export function summarize(detail: UserDetail, today = new Date()) {
  const s = detail.sessions;
  const byDay = minutesByDay(s);
  const totalMin = s.reduce((a, x) => a + x.duration_sec / 60, 0);
  const weekAgo = today.getTime() - 7 * DAY;
  const monthStart = addDays(startOfDay(today), -29).getTime();
  const last30 = s.filter((x) => x.started_at >= monthStart);
  const subjects = new Map(detail.subjects.map((x) => [x.id, x]));
  const bySubject = new Map<string, number>();
  for (const x of s) {
    const key = x.subject_id && subjects.has(x.subject_id) ? x.subject_id : '';
    bySubject.set(key, (bySubject.get(key) ?? 0) + x.duration_sec / 60);
  }
  const subjectTotals = [...bySubject.entries()]
    .map(([id, minutes]) => {
      const sub = subjects.get(id);
      return { id, name: sub ? sub.name : 'No subject', color: sub ? sub.color : '#B3ABA0', deleted: sub?.deleted ?? false, minutes };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return {
    byDay,
    totalMin,
    sessions: s.length,
    completed: s.filter((x) => x.completed).length,
    weekMin: s.filter((x) => x.started_at >= weekAgo).reduce((a, x) => a + x.duration_sec / 60, 0),
    prevWeekMin: s.filter((x) => x.started_at >= weekAgo - 7 * DAY && x.started_at < weekAgo).reduce((a, x) => a + x.duration_sec / 60, 0),
    activeDays30: new Set(last30.map((x) => dayKey(x.started_at))).size,
    avgSessionMin: s.length ? totalMin / s.length : 0,
    sessionsPerWeek: s.filter((x) => x.started_at >= today.getTime() - 28 * DAY).length / 4,
    avg30Min: last30.reduce((a, x) => a + x.duration_sec / 60, 0) / 30,
    studyDays: byDay.size,
    streak: streaks(new Set(byDay.keys()), today),
    longestSessionMin: s.reduce((a, x) => Math.max(a, x.duration_sec / 60), 0),
    subjectTotals,
    weekdays: weekdayAverages(s, today),
    recent: [...s].reverse().slice(0, 6),
    subjects,
  };
}

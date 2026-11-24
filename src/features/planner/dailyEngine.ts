import { addDays, startOfDay } from '../../lib/dates';
import { lastStudyDay, sessionMinutes, studyWindows, type BusyTime, type SchedulePlan, type ScheduleResult, type StudySession } from './engine';

// Study-plan scheduler (team rules, Nov 2026):
//  - Each exam gets `sessionsPerDay` sessions of `blocksPerSession` focus blocks on every study day
//    until the exam (default: one session a day), inside its study windows (Preferences > Study Slots).
//  - Priority = urgency + difficulty (higher first), then the earlier exam. On each day the
//    highest-priority exam always gets its own sessions, even past the daily goal (the user chose them;
//    the screen warns). Every other exam's session must fit under the daily goal.
//  - A session that doesn't fit its day moves to the nearest other study day (before its exam) with room.
//    If no day has room, it is reported as unplaced.
//  - Sessions start as early as the window allows, so each exam studies at about the same time every day.
//  - Auto-sized exams (the user kept the default focus blocks and focus time) are resized to fit:
//    a session that doesn't fit first loses focus blocks (down to 1) before moving to another day; as a last
//    resort its focus time shortens (never under 15 minutes, Reti's minimum). After placing, close exams
//    (7 days or less) and hard exams grow by a block at a time while the day stays under the goal.
//    Exams with sizes the user set are never resized; they keep the over-goal warning instead.
// Pure TypeScript, no Expo or React Native imports, so it is easy to test.

export type DailyPlan = SchedulePlan & {
  sessionsPerDay: number;
  blocksPerSession: number;
  /** Urgency + difficulty; higher is scheduled first. */
  priority: number;
  /** Sessions already kept on a date (finished, started, locked, protected), counted toward that day. */
  keptPerDay?: Record<number, number>;
  /** True when the user kept the default size: the planner may shrink or grow sessions to fit the goal. */
  autoSize?: boolean;
};

/** Shortest focus time the planner will make (Reti credits nothing under 15 minutes). */
export const MIN_AUTO_FOCUS_MIN = 15;
/** Auto-sized sessions grow to at most this many blocks over the plan's own size. */
export const MAX_AUTO_EXTRA_BLOCKS = 2;
const GROW_WITHIN_DAYS = 7;
const HARD_DIFFICULTY = 5;

export type DailyScheduleResult = ScheduleResult & {
  /** Sessions per plan that could not be placed on any day. */
  unplacedSessions: Record<string, number>;
  /** Auto-sized sessions made smaller or larger than the plan's own size, per plan. */
  resized: Record<string, { shrunk: number; grown: number }>;
};

type Size = { blocks: number; focusMin: number };

type Interval = { start: number; end: number; study: boolean };

const byPriority = (a: DailyPlan, b: DailyPlan) =>
  b.priority - a.priority || a.examDate - b.examDate || a.id.localeCompare(b.id);

export function generateDailySchedule(input: { now: Date; plans: DailyPlan[]; busy: BusyTime[]; dailyGoalMin: number }): DailyScheduleResult {
  const { plans, dailyGoalMin } = input;
  const today = startOfDay(input.now);
  const nowMin = input.now.getHours() * 60 + input.now.getMinutes() + (input.now.getSeconds() > 0 ? 1 : 0);
  const lastDay = Math.max(today - 1, ...plans.map(p => lastStudyDay(p)));

  // Per day: what is already taking time, and focus minutes already counted toward the goal.
  const days = new Map<number, { intervals: Interval[]; focus: number; planned: number }>();
  const day = (date: number) => {
    let d = days.get(date);
    if (!d) {
      const intervals: Interval[] = [];
      let focus = 0;
      for (const b of input.busy) {
        if (b.date === date) {
          intervals.push({ start: b.startMinute, end: b.endMinute, study: false });
          focus += b.focusMinutes ?? b.endMinute - b.startMinute;
        } else if (b.date === addDays(date, -1) && b.endMinute > 1440) {
          intervals.push({ start: 0, end: b.endMinute - 1440, study: false });
        }
      }
      d = { intervals, focus, planned: 0 };
      days.set(date, d);
    }
    return d;
  };

  const full = (p: DailyPlan): Size => ({ blocks: p.blocksPerSession, focusMin: p.focusMin });
  const lengthOf = (p: DailyPlan, size: Size) =>
    sessionMinutes(size.blocks, { focusMin: size.focusMin, focusCount: size.blocks, breakMin: p.breakMin, longBreakMin: p.longBreakMin });
  const focusOf = (size: Size) => size.blocks * size.focusMin;
  /** Sizes to try, largest first: fewer blocks at the plan's focus time. */
  const blockSizes = (p: DailyPlan): Size[] => p.autoSize
    ? Array.from({ length: p.blocksPerSession }, (_, i) => ({ blocks: p.blocksPerSession - i, focusMin: p.focusMin }))
    : [full(p)];
  /** Last resort for auto-sized plans: one block with a shorter focus time. */
  const shortSizes = (p: DailyPlan): Size[] => {
    const out: Size[] = [];
    if (p.autoSize) for (let m = p.focusMin - 5; m >= MIN_AUTO_FOCUS_MIN; m -= 5) out.push({ blocks: 1, focusMin: m });
    return out;
  };
  const fitsGoal = (date: number, size: Size) => day(date).focus + focusOf(size) <= dailyGoalMin;

  /** Earliest start for one session of `p` on `date`, or null. Other study keeps a long break away. */
  const findStart = (p: DailyPlan, date: number, size: Size = full(p)): number | null => {
    const len = lengthOf(p, size);
    const taken = [...day(date).intervals].sort((a, b) => a.start - b.start);
    for (const w of studyWindows(p, date)) {
      let start = date === today ? Math.max(w.start, nowMin) : w.start;
      let moved = true;
      while (moved) {
        moved = false;
        for (const iv of taken) {
          const gap = iv.study ? Math.max(30, p.longBreakMin) : p.breakMin;
          if (start < iv.end + gap && start + len + gap > iv.start) { start = iv.end + gap; moved = true; }
        }
      }
      if (start + len <= w.end) return start;
    }
    return null;
  };

  const sessions: StudySession[] = [];
  const placed: { plan: DailyPlan; session: StudySession; interval: Interval }[] = [];
  const place = (p: DailyPlan, date: number, start: number, size: Size) => {
    const len = lengthOf(p, size);
    const d = day(date);
    const interval = { start, end: start + len, study: true };
    d.intervals.push(interval);
    d.focus += focusOf(size);
    d.planned += focusOf(size);
    const session: StudySession = { planId: p.id, subjectId: p.subjectId, date, startMinute: start, endMinute: start + len, blocks: size.blocks, focusMin: size.focusMin };
    sessions.push(session);
    placed.push({ plan: p, session, interval });
  };
  /** Largest size that fits the goal (unless `ignoreGoal`) and has a start time on `date`. */
  const tryPlace = (p: DailyPlan, date: number, sizes: Size[], ignoreGoal = false): boolean => {
    for (const size of sizes) {
      if (!ignoreGoal && !fitsGoal(date, size)) continue;
      const start = findStart(p, date, size);
      if (start !== null) { place(p, date, start, size); return true; }
    }
    return false;
  };

  const valid = plans.filter(p => p.sessionsPerDay > 0 && p.blocksPerSession > 0 && p.focusMin > 0);
  const deferred: { plan: DailyPlan; from: number }[] = [];

  // Pass 1: every study day, exams in priority order.
  for (let date = today; date <= lastDay; date = addDays(date, 1)) {
    const eligible = valid.filter(p => studyWindows(p, date).length > 0).sort(byPriority);
    if (eligible.length) day(date); // so kept sessions on this day are counted in the goal check
    eligible.forEach((p, rank) => {
      // Today with no study time left: today's session is simply missed (missed work is not moved).
      if (date === today && !studyWindows(p, date).some(w => w.end > nowMin)) return;
      const quota = Math.max(0, p.sessionsPerDay - (p.keptPerDay?.[date] ?? 0));
      for (let i = 0; i < quota; i++) {
        // Shrink before moving. The day's top exam always keeps a session: a shorter one if that fits the
        // goal, otherwise past the goal (its full size, or one block for an auto-sized plan).
        const ok = tryPlace(p, date, blockSizes(p))
          || (rank === 0 && (tryPlace(p, date, shortSizes(p))
            || tryPlace(p, date, p.autoSize ? [{ blocks: 1, focusMin: p.focusMin }] : [full(p)], true)));
        if (!ok) deferred.push({ plan: p, from: date });
      }
    });
  }

  // Pass 2: moved sessions go to the nearest study day that still has room under the goal.
  const unplacedSessions: Record<string, number> = Object.fromEntries(valid.map(p => [p.id, 0]));
  for (const { plan, from } of deferred.sort((a, b) => byPriority(a.plan, b.plan) || a.from - b.from)) {
    const candidates: number[] = [];
    for (let date = today; date <= lastStudyDay(plan); date = addDays(date, 1)) {
      if (date !== from && studyWindows(plan, date).length > 0) candidates.push(date);
    }
    candidates.sort((a, b) => Math.abs(a - from) - Math.abs(b - from) || a - b);
    // Nearest day at a normal (or fewer-block) size first; then shorter focus time, its own day first.
    const ok = candidates.some(date => tryPlace(plan, date, blockSizes(plan)))
      || [from, ...candidates].some(date => studyWindows(plan, date).length > 0 && tryPlace(plan, date, shortSizes(plan)));
    if (!ok) unplacedSessions[plan.id]++;
  }

  // Pass 3: grow auto-sized sessions of close or hard exams while their day stays under the goal.
  const canGrow = (p: DailyPlan, date: number) => p.autoSize
    && (p.difficulty >= HARD_DIFFICULTY || startOfDay(p.examDate) - date <= GROW_WITHIN_DAYS * 86_400_000);
  for (const [date, d] of days) {
    const growable = placed.filter(x => x.session.date === date && x.session.focusMin === x.plan.focusMin && canGrow(x.plan, date))
      .sort((a, b) => byPriority(a.plan, b.plan));
    let grew = true;
    while (grew) {
      grew = false;
      for (const x of growable) {
        const size = { blocks: (x.session.blocks) + 1, focusMin: x.plan.focusMin };
        if (size.blocks > x.plan.blocksPerSession + MAX_AUTO_EXTRA_BLOCKS || d.focus + x.plan.focusMin > dailyGoalMin) continue;
        const end = x.session.startMinute + lengthOf(x.plan, size);
        const inWindow = studyWindows(x.plan, date).some(w => x.session.startMinute >= w.start && end <= w.end);
        const clear = d.intervals.every(iv => iv === x.interval
          || !(x.session.startMinute < iv.end + (iv.study ? Math.max(30, x.plan.longBreakMin) : x.plan.breakMin)
            && end + (iv.study ? Math.max(30, x.plan.longBreakMin) : x.plan.breakMin) > iv.start));
        if (!inWindow || !clear) continue;
        x.session.blocks = size.blocks;
        x.session.endMinute = end;
        x.interval.end = end;
        d.focus += x.plan.focusMin;
        d.planned += x.plan.focusMin;
        grew = true;
      }
    }
  }
  const resized: Record<string, { shrunk: number; grown: number }> = Object.fromEntries(valid.map(p => [p.id, { shrunk: 0, grown: 0 }]));
  for (const { plan, session } of placed) {
    const focus = session.blocks * (session.focusMin ?? plan.focusMin);
    if (focus < plan.blocksPerSession * plan.focusMin) resized[plan.id].shrunk++;
    else if (focus > plan.blocksPerSession * plan.focusMin) resized[plan.id].grown++;
  }

  sessions.sort((a, b) => a.date - b.date || a.startMinute - b.startMinute);
  const overGoalDays = [...days.entries()]
    // A day counts when it has study sessions (new or kept) and goes over the goal.
    .filter(([date, d]) => (d.planned > 0 || valid.some(p => (p.keptPerDay?.[date] ?? 0) > 0)) && d.focus > dailyGoalMin)
    .map(([date, d]) => ({ date, minutes: d.focus }))
    .sort((a, b) => a.date - b.date);
  const shortfallByPlan = Object.fromEntries(valid.map(p => [p.id, unplacedSessions[p.id] * p.blocksPerSession]));
  return {
    sessions,
    overGoalDays,
    unplacedSessions,
    resized,
    shortfallByPlan,
    shortfallBlocks: Object.values(shortfallByPlan).reduce((a, b) => a + b, 0),
  };
}

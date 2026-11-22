import { addDays, startOfDay } from '../../lib/dates';
import { difficultyWeight, FOCUS_BLOCK_MIN, LONG_BREAK_MIN } from './rules';
import type { PlannerInput, PlannerResult } from './types';

export type SchedulePlan = {
  id: string; subjectId: string; examDate: number; remainingBlocks: number;
  difficulty: number; urgency: number; start: number; end: number;
  focusMin: number; focusCount: number; breakMin: number; longBreakMin: number;
  excluded: number[]; studyDays?: number[]; planStartDate?: number;
};
export type BusyTime = { date: number; startMinute: number; endMinute: number; focusMinutes?: number };
export type StudySession = { planId: string; subjectId: string; date: number; startMinute: number; endMinute: number; blocks: number };
export type ScheduleResult = { sessions: StudySession[]; shortfallBlocks: number; shortfallByPlan: Record<string, number> };

/** Elapsed minutes, including breaks between blocks, never a break after the final block. */
export function sessionMinutes(blocks: number, prefs: Pick<SchedulePlan, 'focusMin' | 'focusCount' | 'breakMin' | 'longBreakMin'>): number {
  let minutes = blocks * prefs.focusMin;
  const run = Math.min(prefs.focusCount, Math.max(1, Math.floor(120 / prefs.focusMin)));
  for (let i = 1; i < blocks; i++) minutes += i % run === 0 ? Math.max(LONG_BREAK_MIN, prefs.longBreakMin) : prefs.breakMin;
  return minutes;
}

/** Overnight windows belong to their starting weekday. Exclusions block the whole calendar date. */
export function studyWindows(plan: Pick<SchedulePlan, 'start' | 'end' | 'examDate' | 'excluded' | 'studyDays' | 'planStartDate'>, date: number): { start: number; end: number }[] {
  if (date >= startOfDay(plan.examDate) || plan.excluded.includes(date) || plan.start === plan.end) return [];
  const allowed = (anchor: number) => (plan.planStartDate === undefined || anchor >= plan.planStartDate)
    && !plan.excluded.includes(anchor) && (!plan.studyDays || plan.studyDays.includes(new Date(anchor).getDay()));
  if (plan.end > plan.start) return allowed(date) ? [{ start: plan.start, end: plan.end }] : [];
  const windows = [];
  if (plan.end > 0 && allowed(addDays(date, -1))) windows.push({ start: 0, end: plan.end });
  if (allowed(date)) windows.push({ start: plan.start, end: 1440 });
  return windows;
}

const eligible = (plan: SchedulePlan, date: number) => studyWindows(plan, date).length > 0;

/** Pure, deterministic scheduler. Plans share time slots and one daily focus budget. */
export function generateSchedule(input: { now: Date; plans: SchedulePlan[]; busy: BusyTime[]; dailyGoalMin: number }): ScheduleResult {
  const { plans, busy } = input;
  const today = startOfDay(input.now);
  const remaining = new Map(plans.map(p => [p.id, Math.max(0, Math.floor(p.remainingBlocks))]));
  const sessions: StudySession[] = [];
  const deadline = Math.max(today, ...plans.map(p => startOfDay(p.examDate)));
  // Weighted fair allocation in MINUTES: harder subjects receive more of limited capacity.
  // Remaining work per eligible day also accounts for deadlines and unavailable dates.
  // Carry service across days so a small daily goal doesn't always choose the same subject.
  const servedMinutes = new Map<string, number>();
  const lastStudyDates = new Map<string, number>();
  const shares = new Map(plans.map(p => {
    let days = 0;
    for (let date = today; date < startOfDay(p.examDate); date = addDays(date, 1)) if (eligible(p, date)) {
      days++;
      lastStudyDates.set(p.id, date);
    }
    return [p.id, Math.max(1, p.remainingBlocks * p.focusMin / Math.max(1, days)) * difficultyWeight(p.difficulty)];
  }));
  const used = new Map<string, number>();
  let cursor = input.now.getHours() * 60 + input.now.getMinutes() + (input.now.getSeconds() > 0 ? 1 : 0);
  let continuous = 0;
  let previous: SchedulePlan | undefined;
  for (let date = today; date < deadline; date = addDays(date, 1)) {
    if (date !== today) {
      cursor -= 1440;
      if (!previous || cursor <= -Math.max(LONG_BREAK_MIN, previous.longBreakMin)) {
        cursor = 0;
        continuous = 0;
        previous = undefined;
        used.clear();
      }
    }
    // Keep recovery time for commitments ending near midnight, including on regeneration.
    const recovery = Math.max(LONG_BREAK_MIN, ...plans.map(p => p.longBreakMin));
    const occupied = busy.flatMap(b => b.date === date ? [b]
      : b.date === addDays(date, -1) && b.endMinute + recovery > 1440
        ? [{ ...b, startMinute: b.startMinute - 1440, endMinute: b.endMinute - 1440,
          focusMinutes: b.endMinute > 1440 ? (b.focusMinutes ?? b.endMinute - b.startMinute) * (b.endMinute - 1440) / (b.endMinute - b.startMinute) : 0 }]
        : []);
    let budget = Math.max(0, input.dailyGoalMin - occupied.reduce((sum, b) => sum + (b.focusMinutes ?? b.endMinute - b.startMinute), 0));
    const blocked = new Set<string>();
    while (true) {
      const candidates = plans.filter(p => eligible(p, date) && !blocked.has(p.id) && (remaining.get(p.id) ?? 0) > 0
        && p.focusMin > 0 && p.focusMin <= 120 && p.focusMin <= budget).map(plan => {
        const previousCount = previous ? used.get(previous.id) ?? 0 : 0;
        const longBreak = !!previous && (continuous + plan.focusMin > 120 || previousCount % previous.focusCount === 0);
        const gap = previous ? longBreak ? Math.max(LONG_BREAK_MIN, previous.longBreakMin, plan.longBreakMin) : Math.max(previous.breakMin, plan.breakMin) : 0;
        let start = Infinity;
        for (const window of studyWindows(plan, date)) {
          let candidate = Math.max(0, cursor + gap, window.start);
          for (const b of [...occupied].sort((a, b) => a.startMinute - b.startMinute)) {
            if (candidate + plan.focusMin + plan.breakMin > b.startMinute && candidate < b.endMinute + Math.max(LONG_BREAK_MIN, plan.longBreakMin)) candidate = b.endMinute + Math.max(LONG_BREAK_MIN, plan.longBreakMin);
          }
          // Store whole focus blocks on their actual date; resume after midnight in a new session.
          if (candidate + plan.focusMin <= window.end) { start = candidate; break; }
        }
        return { plan, start, longBreak, gap };
      }).filter(slot => {
        if (Number.isFinite(slot.start)) return true;
        blocked.add(slot.plan.id);
        return false;
      }).sort((a, b) => Number(lastStudyDates.get(b.plan.id) === date) - Number(lastStudyDates.get(a.plan.id) === date)
        || a.start - b.start
        || (servedMinutes.get(a.plan.id) ?? 0) / shares.get(a.plan.id)! - (servedMinutes.get(b.plan.id) ?? 0) / shares.get(b.plan.id)!
        || a.plan.examDate - b.plan.examDate || (b.plan.difficulty + b.plan.urgency) - (a.plan.difficulty + a.plan.urgency)
        || a.plan.id.localeCompare(b.plan.id));
      if (!candidates.length) break;
      const { plan, start, longBreak, gap } = candidates[0];
      if (start - cursor >= LONG_BREAK_MIN) continuous = 0;
      const last = sessions[sessions.length - 1];
      if (last?.date === date && last.planId === plan.id && !longBreak && start === cursor + gap) {
        last.blocks++;
        last.endMinute = start + plan.focusMin;
      } else sessions.push({ planId: plan.id, subjectId: plan.subjectId, date, startMinute: start, endMinute: start + plan.focusMin, blocks: 1 });
      used.set(plan.id, (used.get(plan.id) ?? 0) + 1);
      servedMinutes.set(plan.id, (servedMinutes.get(plan.id) ?? 0) + plan.focusMin);
      remaining.set(plan.id, remaining.get(plan.id)! - 1);
      budget -= plan.focusMin;
      continuous += plan.focusMin;
      cursor = start + plan.focusMin;
      previous = plan;
    }
  }
  const shortfallByPlan = Object.fromEntries(remaining);
  return { sessions, shortfallByPlan, shortfallBlocks: [...remaining.values()].reduce((a, b) => a + b, 0) };
}

/** Public API for an ordinary study week or one exam, using the same scheduler. */
export function generatePlan(input: PlannerInput): PlannerResult {
  const today = startOfDay(input.today);
  const deadline = input.exam ? startOfDay(input.exam.date) : addDays(today, 7);
  const dateKey = (date: number) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const parseDate = (date: string) => new Date(`${date}T00:00:00`).getTime();
  const selected = input.subjects.filter(s => !input.exam || s.id === input.exam.subjectId);
  let days = 0;
  for (let date = today; date < deadline; date = addDays(date, 1)) if (input.studyDays.includes(new Date(date).getDay()) && !input.excludedDates.includes(dateKey(date))) days++;
  const fixed = input.existing;
  const result = generateSchedule({ now: input.today, dailyGoalMin: input.dailyGoalMin,
    busy: fixed.map(s => ({ date: parseDate(s.date), startMinute: input.window.startMinute,
      endMinute: input.window.startMinute + sessionMinutes(s.blocks, { focusMin: FOCUS_BLOCK_MIN, focusCount: 4, breakMin: 5, longBreakMin: 30 }), focusMinutes: s.blocks * FOCUS_BLOCK_MIN })),
    plans: selected.map(s => ({ ...s, id: s.id, subjectId: s.id, examDate: deadline, start: input.window.startMinute, end: input.window.endMinute,
      remainingBlocks: Math.max(0, Math.ceil(days * Math.floor(input.dailyGoalMin / FOCUS_BLOCK_MIN) / Math.max(1, selected.length)) - fixed.filter(b => b.subjectId === s.id).reduce((sum, b) => sum + b.blocks, 0)),
      focusMin: FOCUS_BLOCK_MIN, focusCount: 4, breakMin: 5, longBreakMin: 30,
      studyDays: input.studyDays, excluded: input.excludedDates.map(parseDate) })) });
  return { sessions: [...fixed, ...result.sessions.map(s => ({ date: dateKey(s.date), subjectId: s.subjectId, blocks: s.blocks }))], shortfallBlocks: result.shortfallBlocks };
}

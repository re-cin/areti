import { addDays, startOfDay } from '../../lib/dates';
import { generatePlan, generateSchedule, sessionMinutes, type SchedulePlan } from './engine';

const today = new Date(2026, 10, 23, 8);
const day = startOfDay(today);
const plan = (changes: Partial<SchedulePlan> = {}): SchedulePlan => ({
  id: 'math', subjectId: 'math', examDate: addDays(day, 3), remainingBlocks: 12,
  difficulty: 3, urgency: 3, start: 19 * 60, end: 21 * 60,
  focusMin: 25, focusCount: 4, breakMin: 5, longBreakMin: 30, excluded: [], ...changes,
});

describe('student scheduling', () => {
  it('uses both sides of midnight, with recovery carried into the next date', () => {
    const result = generateSchedule({ now: today, plans: [plan({ start: 22 * 60, end: 2 * 60, remainingBlocks: 8,
      planStartDate: day, studyDays: [1] })], busy: [], dailyGoalMin: 200 });
    expect(result.sessions.map(s => [s.date, s.startMinute, s.endMinute, s.blocks])).toEqual([
      [day, 1320, 1435, 4], [addDays(day, 1), 25, 110, 3],
    ]);
    expect(result.shortfallBlocks).toBe(1);
  });

  it('resumes the previous weekday window after midnight without scheduling in the past', () => {
    const result = generateSchedule({ now: new Date(2026, 10, 24, 0, 30), plans: [plan({
      start: 1320, end: 120, studyDays: [1], remainingBlocks: 2, planStartDate: day,
    })], busy: [], dailyGoalMin: 100 });
    expect(result.shortfallBlocks).toBe(0);
    expect(result.sessions).toEqual([{ planId: 'math', subjectId: 'math', date: addDays(day, 1), startMinute: 30, endMinute: 85, blocks: 2 }]);
  });

  it('blocks exam day and excluded dates even when the night starts on an allowed day', () => {
    for (const changes of [{ examDate: addDays(day, 1) }, { excluded: [addDays(day, 1)] }]) {
      const result = generateSchedule({ now: today, plans: [plan({ start: 1320, end: 120, studyDays: [1],
        remainingBlocks: 8, planStartDate: day, ...changes })], busy: [], dailyGoalMin: 200 });
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0]).toMatchObject({ date: day, blocks: 4 });
    }
  });

  it('honors after-midnight commitments and the shared calendar-day budget', () => {
    const tomorrow = addDays(day, 1);
    const result = generateSchedule({ now: today, plans: [plan({ start: 1320, end: 120, remainingBlocks: 20,
      planStartDate: day })], busy: [{ date: tomorrow, startMinute: 0, endMinute: 60, focusMinutes: 60 }], dailyGoalMin: 100 });
    const next = result.sessions.filter(s => s.date === tomorrow);
    expect(next[0].startMinute).toBeGreaterThanOrEqual(90);
    expect(next.reduce((sum, s) => sum + s.blocks * 25, 60)).toBeLessThanOrEqual(100);
    expect(result.sessions.every(s => s.endMinute <= 1440 && s.startMinute >= 0)).toBe(true);
  });

  it('keeps the recovery gap for a fixed session ending just before midnight', () => {
    const result = generateSchedule({ now: new Date(2026, 10, 24, 0, 5), plans: [plan({
      start: 1320, end: 120, studyDays: [1], remainingBlocks: 2, planStartDate: day,
    })], busy: [{ date: day, startMinute: 1320, endMinute: 1435, focusMinutes: 100 }], dailyGoalMin: 100 });
    expect(result.sessions[0].startMinute).toBe(25);
    expect(result.sessions[0].date).toBe(addDays(day, 1));
  });

  it('allows a window ending exactly at midnight and rejects an empty window', () => {
    const midnight = generateSchedule({ now: today, plans: [plan({ start: 1320, end: 0, planStartDate: day })], busy: [], dailyGoalMin: 100 });
    expect(midnight.sessions.every(s => s.startMinute >= 1320 && s.endMinute <= 1440)).toBe(true);
    expect(midnight.shortfallBlocks).toBe(0);
    const empty = generateSchedule({ now: today, plans: [plan({ start: 1320, end: 1320 })], busy: [], dailyGoalMin: 100 });
    expect(empty.sessions).toEqual([]);
  });

  it('fits focus blocks AND breaks into the available window', () => {
    const result = generateSchedule({ now: today, plans: [plan()], busy: [], dailyGoalMin: 100 });
    expect(result.shortfallBlocks).toBe(0);
    expect(result.sessions).toHaveLength(3);
    for (const session of result.sessions) {
      expect(session.blocks).toBe(4);
      expect(session.endMinute - session.startMinute).toBe(115);
      expect(session.endMinute).toBeLessThanOrEqual(21 * 60);
    }
  });

  it('reports insufficient capacity instead of overloading days', () => {
    const result = generateSchedule({ now: today, plans: [plan({ end: 20 * 60 })], busy: [], dailyGoalMin: 100 });
    expect(result.sessions.reduce((sum, s) => sum + s.blocks, 0)).toBe(6);
    expect(result.shortfallBlocks).toBe(6);
  });

  it('shares the daily goal between competing exams without overlapping sessions', () => {
    const result = generateSchedule({ now: today, plans: [plan(), plan({ id: 'science', subjectId: 'science', difficulty: 5 })], busy: [], dailyGoalMin: 100 });
    for (let date = day; date < addDays(day, 3); date = addDays(date, 1)) {
      const sessions = result.sessions.filter(s => s.date === date);
      expect(sessions.reduce((sum, s) => sum + s.blocks * 25, 0)).toBeLessThanOrEqual(100);
      expect(new Set(sessions.map(s => s.subjectId)).size).toBe(2);
      for (let i = 1; i < sessions.length; i++) expect(sessions[i].startMinute).toBeGreaterThanOrEqual(sessions[i - 1].endMinute + 5);
    }
    expect(result.sessions[0].subjectId).toBe('science');
    expect(result.shortfallBlocks).toBe(12);
  });

  it('keeps fixed commitments and counts their focus time against the daily goal', () => {
    const result = generateSchedule({ now: today, plans: [plan({ examDate: addDays(day, 1) })], dailyGoalMin: 100,
      busy: [{ date: day, startMinute: 19 * 60, endMinute: 20 * 60, focusMinutes: 60 }] });
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].startMinute).toBeGreaterThanOrEqual(20 * 60 + 30);
    expect(result.sessions[0].blocks).toBe(1);
  });

  it('honors excluded dates and selected weekdays and never uses exam day', () => {
    const excluded = addDays(day, 1);
    const result = generateSchedule({ now: today, plans: [plan({ excluded: [excluded], studyDays: [3] })], busy: [], dailyGoalMin: 100 });
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].date).toBe(addDays(day, 2));
    expect(result.shortfallBlocks).toBe(8);
  });

  it('carries missed work forward and never schedules in the past', () => {
    const now = new Date(2026, 10, 23, 22);
    const result = generateSchedule({ now, plans: [plan()], busy: [], dailyGoalMin: 100 });
    expect(result.sessions.every(s => s.date > day)).toBe(true);
    expect(result.sessions.reduce((sum, s) => sum + s.blocks, 0)).toBe(8);
    expect(result.shortfallBlocks).toBe(4);
  });

  it('cannot manufacture a study day when the exam is today', () => {
    const result = generateSchedule({ now: today, plans: [plan({ examDate: day })], busy: [], dailyGoalMin: 100 });
    expect(result.sessions).toEqual([]);
    expect(result.shortfallBlocks).toBe(12);
  });

  it('inserts at least 30 minutes of recovery after 120 minutes of focus', () => {
    const result = generateSchedule({ now: today, plans: [plan({ start: 9 * 60, end: 18 * 60, focusMin: 60, focusCount: 8, remainingBlocks: 6, examDate: addDays(day, 1) })], busy: [], dailyGoalMin: 360 });
    expect(result.sessions.map(s => s.blocks)).toEqual([2, 2, 2]);
    expect(result.sessions[1].startMinute - result.sessions[0].endMinute).toBeGreaterThanOrEqual(30);
    expect(result.sessions[2].startMinute - result.sessions[1].endMinute).toBeGreaterThanOrEqual(30);
  });

  it('accounts for long breaks in existing session durations', () => {
    expect(sessionMinutes(5, plan())).toBe(170);
    expect(sessionMinutes(3, plan({ focusMin: 60, focusCount: 8 }))).toBe(215);
  });

  it('uses an earlier availability window even if a later window has a higher priority', () => {
    const result = generateSchedule({ now: today, dailyGoalMin: 100, busy: [], plans: [
      plan({ id: 'late', start: 19 * 60, end: 21 * 60, remainingBlocks: 2, difficulty: 5 }),
      plan({ id: 'early', start: 9 * 60, end: 11 * 60, remainingBlocks: 2, difficulty: 1 }),
    ] });
    expect(result.sessions[0].planId).toBe('early');
    expect(result.shortfallBlocks).toBe(0);
  });

  it('generates ordinary study without an exam and keeps locked blocks intact', () => {
    const locked = { date: '2026-11-23', subjectId: 'math', blocks: 1, locked: true };
    const result = generatePlan({ today, subjects: [{ id: 'math', name: 'Math', urgency: 3 }],
      window: { startMinute: 19 * 60, endMinute: 21 * 60 }, studyDays: [1, 2, 3, 4, 5], dailyGoalMin: 50,
      excludedDates: [], existing: [locked] });
    expect(result.sessions).toContainEqual(locked);
    expect(result.sessions.length).toBeGreaterThan(1);
    expect(result.shortfallBlocks).toBe(0);
  });

  it('gives Low, Medium, and High comparable subjects a 1:2:3 share of limited study time', () => {
    const plans = [1, 3, 5].map(difficulty => plan({ id: String(difficulty), subjectId: String(difficulty), difficulty,
      start: 9 * 60, end: 15 * 60, examDate: addDays(day, 1), remainingBlocks: 30 }));
    const result = generateSchedule({ now: today, plans, busy: [], dailyGoalMin: 150 });
    const blocks = (id: string) => result.sessions.filter(s => s.planId === id).reduce((sum, s) => sum + s.blocks, 0);
    expect([blocks('1'), blocks('3'), blocks('5')]).toEqual([1, 2, 3]);
    expect(result.shortfallBlocks).toBe(84);
  });

  it('gives an easier subject time across days even with only one block per day', () => {
    const result = generateSchedule({ now: today, busy: [], dailyGoalMin: 25, plans: [
      plan({ id: 'easy', difficulty: 1, examDate: addDays(day, 4), remainingBlocks: 20 }),
      plan({ id: 'hard', difficulty: 5, examDate: addDays(day, 4), remainingBlocks: 20 }),
    ] });
    const blocks = (id: string) => result.sessions.filter(s => s.planId === id).reduce((sum, s) => sum + s.blocks, 0);
    expect(blocks('hard')).toBe(3);
    expect(blocks('easy')).toBe(1);
  });

  it('measures difficulty shares in focus minutes when block lengths differ', () => {
    const plans = [plan({ id: 'easy', difficulty: 1, focusMin: 25, remainingBlocks: 12 }),
      plan({ id: 'hard', difficulty: 5, focusMin: 50, remainingBlocks: 6 })]
      .map(p => ({ ...p, examDate: addDays(day, 1), start: 9 * 60, end: 18 * 60 }));
    const result = generateSchedule({ now: today, plans, busy: [], dailyGoalMin: 200 });
    const minutes = (id: string) => result.sessions.filter(s => s.planId === id).reduce((sum, s) => sum + s.blocks * plans.find(p => p.id === id)!.focusMin, 0);
    expect(minutes('hard')).toBeGreaterThan(minutes('easy'));
    expect(minutes('hard') + minutes('easy')).toBeLessThanOrEqual(200);
  });

  it('uses spare capacity for easier work after the harder target is complete', () => {
    const result = generateSchedule({ now: today, busy: [], dailyGoalMin: 100, plans: [
      plan({ id: 'easy', difficulty: 1, examDate: addDays(day, 1), remainingBlocks: 3 }),
      plan({ id: 'hard', difficulty: 5, examDate: addDays(day, 1), remainingBlocks: 1 }),
    ] });
    expect(result.shortfallBlocks).toBe(0);
    expect(result.sessions.reduce((sum, s) => sum + s.blocks, 0)).toBe(4);
  });

  it('protects the last available study day of an earlier exam, even for an easier subject', () => {
    const result = generateSchedule({ now: today, busy: [], dailyGoalMin: 100, plans: [
      plan({ id: 'easy', difficulty: 1, examDate: addDays(day, 1), remainingBlocks: 4 }),
      plan({ id: 'hard', difficulty: 5, start: 9 * 60, end: 11 * 60, examDate: addDays(day, 7), remainingBlocks: 28 }),
    ] });
    expect(result.shortfallByPlan.easy).toBe(0);
    expect(result.sessions.filter(s => s.date === day).every(s => s.planId === 'easy')).toBe(true);
  });
});

describe('exam priority (Premium)', () => {
  // 12 + 12 blocks wanted, but only 4 blocks a day for 4 days (16): the exams compete for time.
  const two = (priority: number | undefined) => {
    const result = generateSchedule({ now: today, dailyGoalMin: 100, busy: [], plans: [
      plan({ id: 'math', subjectId: 'math', examDate: addDays(day, 4), remainingBlocks: 12, priority }),
      plan({ id: 'sci', subjectId: 'sci', examDate: addDays(day, 4), remainingBlocks: 12 }),
    ] });
    const blocks = (id: string) => result.sessions.filter(s => s.planId === id).reduce((sum, s) => sum + s.blocks, 0);
    return { math: blocks('math'), sci: blocks('sci'), total: result.sessions.reduce((sum, s) => sum + s.blocks, 0) };
  };

  it('is a neutral default: no priority and priority 1 schedule identically', () => {
    expect(two(undefined)).toEqual(two(1));
  });

  it('does not change totals when there is room for everything, only the order', () => {
    const room = (priority: number) => generateSchedule({ now: today, dailyGoalMin: 100, busy: [], plans: [
      plan({ id: 'math', examDate: addDays(day, 4), remainingBlocks: 8, priority }),
      plan({ id: 'sci', subjectId: 'sci', examDate: addDays(day, 4), remainingBlocks: 8 })] });
    expect(room(2).shortfallBlocks).toBe(0);
    expect(room(2).sessions.reduce((sum, s) => sum + s.blocks, 0)).toBe(room(1).sessions.reduce((sum, s) => sum + s.blocks, 0));
  });

  it('gives a prioritized exam a larger share of the same study time when exams compete', () => {
    const normal = two(1);
    const highest = two(2);
    expect(highest.math).toBeGreaterThan(normal.math);
    expect(highest.sci).toBeLessThan(normal.sci);
    expect(highest.total).toBe(normal.total); // time is shared differently, never added
  });
});

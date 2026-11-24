import { generateDailySchedule, type DailyPlan } from './dailyEngine';

const day0 = new Date(2026, 10, 23).getTime(); // a Monday
const D = (n: number) => day0 + n * 86_400_000;
const morning = new Date(2026, 10, 23, 7, 0);

const plan = (over: Partial<DailyPlan> = {}): DailyPlan => ({
  id: 'math', subjectId: 'math', examDate: D(7), examMinute: 9 * 60, remainingBlocks: 0,
  difficulty: 3, urgency: 3, priority: 6, start: 9 * 60, end: 21 * 60,
  focusMin: 25, focusCount: 2, breakMin: 5, longBreakMin: 30, excluded: [],
  sessionsPerDay: 1, blocksPerSession: 2, ...over,
});

const perDay = (sessions: { date: number; planId: string }[], id: string) =>
  sessions.filter(s => s.planId === id).reduce<Record<number, number>>((m, s) => ({ ...m, [s.date]: (m[s.date] ?? 0) + 1 }), {});

describe('daily study-plan scheduler', () => {
  it('gives one session a day on every day until the exam, at the same time', () => {
    const r = generateDailySchedule({ now: morning, plans: [plan()], busy: [], dailyGoalMin: 120 });
    const counts = perDay(r.sessions, 'math');
    // Days 0..6, plus exam day (exam 9:00 -> no room before 8:30 in a 9:00 window).
    expect(Object.keys(counts)).toHaveLength(7);
    expect(Object.values(counts).every(c => c === 1)).toBe(true);
    expect(new Set(r.sessions.map(s => s.startMinute)).size).toBe(1);
    expect(r.shortfallBlocks).toBe(0);
  });

  it('honours more sessions a day than the goal for the top exam, and reports the days over goal', () => {
    const r = generateDailySchedule({ now: morning, plans: [plan({ sessionsPerDay: 3, blocksPerSession: 2, examDate: D(2) })], busy: [], dailyGoalMin: 60 });
    expect(perDay(r.sessions, 'math')[D(0)]).toBe(3);
    expect(r.overGoalDays.length).toBeGreaterThan(0);
  });

  it('lets the higher-priority exam keep its session and moves the other to a day with room', () => {
    const hard = plan({ id: 'hard', subjectId: 'hard', priority: 10, examDate: D(2), blocksPerSession: 4 });
    const easy = plan({ id: 'easy', subjectId: 'easy', priority: 4, examDate: D(5), blocksPerSession: 2 });
    const r = generateDailySchedule({ now: morning, plans: [hard, easy], busy: [], dailyGoalMin: 120 });
    // Days 0-1: hard takes 100 of 120 min, so easy (50) moves to days 2-4 where there is room.
    expect(perDay(r.sessions, 'hard')).toEqual({ [D(0)]: 1, [D(1)]: 1 });
    const easyDays = perDay(r.sessions, 'easy');
    expect(easyDays[D(0)] ?? 0).toBe(0);
    expect(Object.values(easyDays).reduce((a, b) => a + b, 0)).toBe(5);
    expect(r.overGoalDays).toEqual([]);
  });

  it('never studies outside the windows, and keeps the time of tasks and removed sessions free', () => {
    const busy = [{ date: D(0), startMinute: 9 * 60, endMinute: 10 * 60, focusMinutes: 0 }];
    const r = generateDailySchedule({ now: morning, plans: [plan({ examDate: D(1) })], busy, dailyGoalMin: 120 });
    const first = r.sessions[0];
    expect(first.date).toBe(D(0));
    expect(first.startMinute).toBeGreaterThanOrEqual(10 * 60);
  });

  it('counts sessions already kept on a day toward that day', () => {
    const r = generateDailySchedule({ now: morning, plans: [plan({ examDate: D(2), keptPerDay: { [D(0)]: 1 } })], busy: [], dailyGoalMin: 120 });
    expect(perDay(r.sessions, 'math')[D(0)] ?? 0).toBe(0);
    expect(perDay(r.sessions, 'math')[D(1)]).toBe(1);
  });

  it('reports sessions that fit nowhere', () => {
    const r = generateDailySchedule({ now: new Date(2026, 10, 23, 20, 50), plans: [plan({ examDate: D(1), examMinute: 9 * 60 + 10 })], busy: [], dailyGoalMin: 120 });
    expect(r.sessions).toEqual([]);
    expect(r.unplacedSessions.math).toBeGreaterThan(0);
  });

  describe('auto size', () => {
    it('shrinks a lower-priority session to fit the goal before moving it', () => {
      const hard = plan({ id: 'hard', subjectId: 'hard', priority: 10, examDate: D(2), blocksPerSession: 3 });
      const easy = plan({ id: 'easy', subjectId: 'easy', priority: 4, examDate: D(2), blocksPerSession: 3, autoSize: true });
      const r = generateDailySchedule({ now: morning, plans: [hard, easy], busy: [], dailyGoalMin: 120 });
      // Hard takes 75 of 120 min; easy shrinks from 3 blocks (75) to 1 block (25) instead of moving.
      const easyToday = r.sessions.filter(s => s.planId === 'easy' && s.date === D(0));
      expect(easyToday).toHaveLength(1);
      expect(easyToday[0].blocks).toBe(1);
      expect(r.resized.easy.shrunk).toBeGreaterThan(0);
      expect(r.overGoalDays).toEqual([]);
    });

    it('never resizes a size the user set', () => {
      const hard = plan({ id: 'hard', subjectId: 'hard', priority: 10, examDate: D(2), blocksPerSession: 3 });
      const easy = plan({ id: 'easy', subjectId: 'easy', priority: 4, examDate: D(5), blocksPerSession: 3, autoSize: false });
      const r = generateDailySchedule({ now: morning, plans: [hard, easy], busy: [], dailyGoalMin: 120 });
      expect(r.sessions.filter(s => s.planId === 'easy').every(s => s.blocks === 3 && s.focusMin === 25)).toBe(true);
      expect(r.resized.easy).toEqual({ shrunk: 0, grown: 0 });
    });

    it('shortens the focus time as a last resort, never under 15 minutes', () => {
      const busy = [{ date: D(0), startMinute: 9 * 60, endMinute: 10 * 60, focusMinutes: 100 }];
      const r = generateDailySchedule({ now: morning, plans: [plan({ priority: 1, examDate: D(0) + 0, examMinute: 20 * 60, autoSize: true }),
        plan({ id: 'top', subjectId: 'top', priority: 9, examDate: D(0), examMinute: 20 * 60, blocksPerSession: 0 })],
        busy, dailyGoalMin: 120 });
      // 20 min left under the goal: one 20-minute block.
      const today = r.sessions.filter(s => s.planId === 'math' && s.date === D(0));
      expect(today).toHaveLength(1);
      expect(today[0]).toMatchObject({ blocks: 1, focusMin: 20 });
    });

    it('lengthens sessions for a close exam while the day stays under the goal', () => {
      const r = generateDailySchedule({ now: morning, plans: [plan({ examDate: D(3), autoSize: true })], busy: [], dailyGoalMin: 120 });
      // 2 blocks + 2 extra = 4 blocks = 100 min, under the 120-minute goal.
      expect(r.sessions.every(s => s.blocks === 4)).toBe(true);
      expect(r.resized.math.grown).toBe(r.sessions.length);
      expect(r.overGoalDays).toEqual([]);
    });

    it('does not lengthen sessions of a far, easy exam', () => {
      const r = generateDailySchedule({ now: morning, plans: [plan({ examDate: D(20), difficulty: 1, autoSize: true })], busy: [], dailyGoalMin: 120 });
      const early = r.sessions.filter(s => s.date < D(13));
      expect(early.length).toBeGreaterThan(0);
      expect(early.every(s => s.blocks === 2)).toBe(true);
      // The last week before the exam grows.
      expect(r.sessions.filter(s => s.date >= D(14)).every(s => s.blocks > 2)).toBe(true);
    });
  });
});

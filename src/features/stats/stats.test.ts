import { daySummary, intensityLevel, periodSummary, streakDays, streaks, subjectTotals, type StatSession } from './stats';

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();
const s = (ts: number, min: number, subjectId: string | null = 'a', completed = true): StatSession => ({
  startedAt: ts,
  durationSec: min * 60,
  completed,
  subjectId,
});

describe('streaks', () => {
  const days = new Set(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11']);

  it('counts back from today', () => {
    expect(streaks(days, new Date(2026, 8, 11)).current).toBe(2);
  });

  it('keeps yesterday\'s streak alive until today ends', () => {
    expect(streaks(days, new Date(2026, 8, 12)).current).toBe(2);
    expect(streaks(days, new Date(2026, 8, 13)).current).toBe(0);
  });

  it('finds the longest streak', () => {
    expect(streaks(days, new Date(2026, 8, 13)).peak).toBe(3);
  });
});

describe('intensityLevel', () => {
  it('maps minutes to 0..4', () => {
    expect([0, 10, 45, 90, 200].map(intensityLevel)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('daySummary', () => {
  it('adds up minutes, sessions and xp for one day', () => {
    const sessions = [s(at(2026, 9, 10), 25), s(at(2026, 9, 10, 15), 10, 'b', false), s(at(2026, 9, 11), 25)];
    // Every minute studied gives XP, also the 10-minute block that was ended early.
    expect(daySummary(sessions, new Date(2026, 8, 10))).toEqual({ minutes: 35, sessions: 2, xp: 35 });
  });

  it('includes the streak bonus, like Reti', () => {
    const sessions = [8, 9, 10].map((d) => s(at(2026, 9, d), 50));
    expect(daySummary(sessions, new Date(2026, 8, 10)).xp).toBe(55); // day 3 of the streak: +10%
  });
});

describe('streakDays', () => {
  it('counts days with a finished block only', () => {
    const sessions = [s(at(2026, 9, 10), 5), s(at(2026, 9, 11), 40, 'a', false)];
    expect([...streakDays(sessions)]).toEqual(['2026-09-10']);
  });
});

describe('periodSummary', () => {
  // Mon 7 Sep 2026 .. Sun 13 Sep 2026
  const sessions = [s(at(2026, 9, 7), 60), s(at(2026, 9, 8), 30), s(at(2026, 9, 14), 120), s(at(2026, 8, 31), 50)];

  it('week: minutes per day of the selected week', () => {
    const r = periodSummary(sessions, 'week', new Date(2026, 8, 9), new Date(2026, 8, 20));
    expect(r.totalMin).toBe(90);
    expect(r.sessions).toBe(2);
    expect(r.bars).toEqual([60, 30, 0, 0, 0, 0, 0]);
    expect(r.dailyAvgMin).toBeCloseTo(90 / 7);
  });

  it('month: averages only over days that have happened', () => {
    // Today is Sun 20 Sep: 20 days of September have happened (Aug 31 is excluded)
    const r = periodSummary(sessions, 'month', new Date(2026, 8, 1), new Date(2026, 8, 20));
    expect(r.totalMin).toBe(210);
    expect(r.dailyAvgMin).toBeCloseTo(10.5);
    expect(r.barsAreAverages).toBe(true);
    expect(r.bars[0]).toBe(90); // Mondays so far: Sep 7 (60) and Sep 14 (120)
  });

  it('subject totals are sorted, biggest first', () => {
    const r = periodSummary(sessions, 'all', new Date(2026, 8, 9), new Date(2026, 8, 20));
    const totals = subjectTotals([...sessions, s(at(2026, 9, 8), 500, 'b')], r.range);
    expect(totals[0]).toEqual({ subjectId: 'b', minutes: 500 });
  });
});

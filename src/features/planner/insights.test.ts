import { buildInsights, isMissedSession, type InsightSession } from './insights';

const today = 1_000_000;
const DAY = 86_400_000;
const session = (over: Partial<InsightSession> = {}): InsightSession => ({ date: today, endMinute: 600, blocks: 4, completedBlocks: 0, ...over });
const build = (tier: 'free' | 'premium', sessions: InsightSession[], extra: { shortfallBlocks?: number; totalBlocks?: number } = {}) =>
  buildInsights({ tier, sessions, totalBlocks: extra.totalBlocks ?? 12, shortfallBlocks: extra.shortfallBlocks ?? 0, examDate: today + 3 * DAY, today, currentMinute: 720 });

describe('missed sessions', () => {
  it('are unfinished sessions whose time has passed', () => {
    expect(isMissedSession(session({ date: today - DAY }), today, 720)).toBe(true);
    expect(isMissedSession(session({ endMinute: 720 }), today, 720)).toBe(true);
    expect(isMissedSession(session({ endMinute: 721 }), today, 720)).toBe(false);
    expect(isMissedSession(session({ date: today + DAY }), today, 720)).toBe(false);
    expect(isMissedSession(session({ date: today - DAY, completedBlocks: 4 }), today, 720)).toBe(false);
  });
});

describe('workload insights', () => {
  it('gives Free students basic progress and the missed count, but nothing detailed', () => {
    const result = build('free', [session({ date: today - DAY, completedBlocks: 4 }), session({ completedBlocks: 0 })]);
    expect(result).toMatchObject({ completedBlocks: 4, totalBlocks: 12, progressPercent: 33, missedSessions: 1 });
    expect(result.detailed).toBeUndefined();
  });

  it('gives Premium students time left, workload fit and missed analysis', () => {
    const result = build('premium', [session({ date: today - DAY, completedBlocks: 1 }), session({ date: today + DAY })], { shortfallBlocks: 2 });
    expect(result.detailed).toMatchObject({ missedBlocks: 3, upcomingBlocks: 4, daysLeft: 3, shortfallBlocks: 2, enoughTime: false, consistentlyMissing: false });
  });

  it('flags consistently missed sessions only with enough history', () => {
    const missed = [0, 1, 2].map(i => session({ date: today - (i + 1) * DAY }));
    expect(build('premium', missed).detailed?.consistentlyMissing).toBe(true);
    expect(build('premium', missed.slice(0, 2)).detailed?.consistentlyMissing).toBe(false);
    expect(build('premium', [...missed, ...[0, 1, 2].map(i => session({ date: today - (i + 5) * DAY, completedBlocks: 4 }))]).detailed?.consistentlyMissing).toBe(true); // exactly half
  });

  it('never reports more progress than the plan holds and handles an empty plan', () => {
    expect(build('free', [session({ completedBlocks: 4 })], { totalBlocks: 2 })).toMatchObject({ totalBlocks: 4, progressPercent: 100 });
    expect(build('free', [], { totalBlocks: 0 })).toMatchObject({ totalBlocks: 0, progressPercent: 0, missedSessions: 0 });
  });
});

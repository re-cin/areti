import { catchUp, nextRun, phaseMs, projectTimeline, startRun, type TimerConfig } from './session';

const cfg: TimerConfig = { focusMin: 25, breakMin: 5, longBreakMin: 15, focusCount: 2 };
const MIN = 60_000;

describe('nextRun', () => {
  it('goes focus -> break -> focus', () => {
    const r1 = nextRun(startRun(3), cfg);
    expect(r1).toEqual({ phase: 'break', completedBlocks: 1, totalBlocks: 3 });
    expect(nextRun(r1!, cfg)).toEqual({ phase: 'focus', completedBlocks: 1, totalBlocks: 3 });
  });

  it('takes a long break after focusCount blocks', () => {
    const r = nextRun({ phase: 'focus', completedBlocks: 1, totalBlocks: 4 }, cfg);
    expect(r?.phase).toBe('longBreak');
    expect(r?.completedBlocks).toBe(2);
  });

  it('ends right after the last focus block', () => {
    expect(nextRun({ phase: 'focus', completedBlocks: 1, totalBlocks: 2 }, cfg)).toBeNull();
    expect(nextRun(startRun(1), cfg)).toBeNull();
  });
});

describe('catchUp', () => {
  it('does nothing before the phase ends', () => {
    const res = catchUp(startRun(2), 1000 + 25 * MIN, cfg, 1000);
    expect(res.ended).toHaveLength(0);
    expect(res.endsAt).toBe(1000 + 25 * MIN);
  });

  it('chains phases that ended while the app was closed', () => {
    const start = 0;
    const endsAt = start + phaseMs('focus', cfg);
    // 25 focus + 5 break + 10 minutes into the second focus
    const res = catchUp(startRun(3), endsAt, cfg, 40 * MIN);
    expect(res.ended.map((e) => e.ended.phase)).toEqual(['focus', 'break']);
    expect(res.run).toEqual({ phase: 'focus', completedBlocks: 1, totalBlocks: 3 });
    expect(res.endsAt).toBe(55 * MIN);
  });

  it('finishes the run', () => {
    const res = catchUp(startRun(1), 25 * MIN, cfg, 99 * MIN);
    expect(res.run).toBeNull();
    expect(res.ended).toHaveLength(1);
    expect(res.ended[0].next).toBeNull();
  });
});

describe('projectTimeline', () => {
  it('lists every remaining phase end', () => {
    const t = projectTimeline(startRun(2), 25 * MIN, cfg);
    expect(t.map((e) => e.endedAt)).toEqual([25 * MIN, 30 * MIN, 55 * MIN]);
    expect(t[t.length - 1].next).toBeNull();
  });
});

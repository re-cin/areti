import { breakCounts, catchUp, nextRun, projectTimeline, sessionFocusMin, sessionLengthMin, startRun, type Run, type TimerConfig } from './session';

const cfg: TimerConfig = { focusMin: 25, breakMin: 5, longBreakMin: 15, focusCount: 2 };
const MIN = 60_000;

/** F / S / L order of a whole session, e.g. "FSFSFL". */
function order(blocks: number): string {
  let out = '';
  let r: Run | null = startRun(blocks);
  while (r) {
    out += r.phase === 'focus' ? 'F' : r.phase === 'break' ? 'S' : 'L';
    r = nextRun(r, cfg);
  }
  return out;
}

describe('session structure', () => {
  it('puts short breaks between blocks and one long break at the end', () => {
    expect(order(1)).toBe('FL');
    expect(order(2)).toBe('FSFL');
    expect(order(3)).toBe('FSFSFL');
    expect(order(4)).toBe('FSFSFSFL');
  });

  it('counts breaks', () => {
    expect(breakCounts(1)).toEqual({ short: 0, long: 1 });
    expect(breakCounts(4)).toEqual({ short: 3, long: 1 });
    expect(breakCounts(15)).toEqual({ short: 14, long: 1 });
  });

  it('totals session length: focus + short breaks + the long break', () => {
    const c: TimerConfig = { focusMin: 25, breakMin: 5, longBreakMin: 15, focusCount: 4 };
    expect(sessionFocusMin(c)).toBe(100);
    expect(sessionLengthMin(c)).toBe(100 + 3 * 5 + 15);
  });
});

describe('catchUp', () => {
  it('does nothing before the phase ends', () => {
    const res = catchUp(startRun(2), 1000 + 25 * MIN, cfg, 1000);
    expect(res.ended).toHaveLength(0);
  });

  it('chains phases that ended while the app was closed', () => {
    const res = catchUp(startRun(3), 25 * MIN, cfg, 40 * MIN); // 25 focus + 5 break + 10 into block 2
    expect(res.ended.map((e) => e.ended.phase)).toEqual(['focus', 'break']);
    expect(res.run).toEqual({ phase: 'focus', completedBlocks: 1, totalBlocks: 3 });
    expect(res.endsAt).toBe(55 * MIN);
  });

  it('finishes after the final long break', () => {
    const res = catchUp(startRun(1), 25 * MIN, cfg, 99 * MIN); // 25 focus + 15 long break
    expect(res.run).toBeNull();
    expect(res.ended.map((e) => e.ended.phase)).toEqual(['focus', 'longBreak']);
  });
});

describe('projectTimeline', () => {
  it('lists every remaining phase end', () => {
    const t = projectTimeline(startRun(2), 25 * MIN, cfg);
    expect(t.map((e) => e.endedAt)).toEqual([25 * MIN, 30 * MIN, 55 * MIN, 70 * MIN]);
  });
});

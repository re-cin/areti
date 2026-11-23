import { focusStats, momentumNow, minutesInSlots, inWindow, DEFAULT_SLEEP } from './index';

const DAY_SLOT = [{ start: 9 * 60, end: 21 * 60 }];

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo, d, h, mi).getTime();
const block = (start: number, minutes: number) => ({ startedAt: start, durationSec: minutes * 60 });

describe('focusStats', () => {
  const now = at(2026, 10, 22, 18);
  it('is empty with no sessions', () => {
    expect(focusStats([], now)).toEqual({ totalExp: 0, expToday: 0, minutesToday: 0, streakDays: 0 });
  });
  it('credits today with the 15-minute rule', () => {
    const s = focusStats([block(at(2026, 10, 22, 9), 25), block(at(2026, 10, 22, 10), 14)], now);
    expect(s.minutesToday).toBe(25);
    expect(s.expToday).toBe(25);
    expect(s.streakDays).toBe(1);
  });
  it('applies the streak bonus from day 3', () => {
    const days = [20, 21, 22].map((d) => block(at(2026, 10, d, 9), 50));
    const s = focusStats(days, now);
    expect(s.streakDays).toBe(3);
    expect(s.expToday).toBe(55); // +10%
    expect(s.totalExp).toBe(50 + 50 + 55);
  });
  it('keeps yesterday\'s streak alive before studying today', () => {
    const s = focusStats([block(at(2026, 10, 20, 9), 30), block(at(2026, 10, 21, 9), 30)], now);
    expect(s.streakDays).toBe(2);
    expect(s.minutesToday).toBe(0);
  });
  it('caps a day at the ceiling', () => {
    const s = focusStats(Array.from({ length: 7 }, (_, i) => block(at(2026, 10, 22, 6 + i * 2), 100)), now);
    expect(s.minutesToday).toBe(600);
  });
});

describe('momentum replay', () => {
  it('starts at 50', () => expect(momentumNow([], at(2026, 10, 22, 12))).toBe(50));
  it('gains on a block and decays in slots only', () => {
    const start = at(2026, 10, 22, 10);
    const recs = [block(start, 50)]; // ends 10:50, +20 -> 70
    expect(momentumNow(recs, at(2026, 10, 22, 10, 50), DAY_SLOT)).toBe(70);
    expect(momentumNow(recs, at(2026, 10, 22, 11, 50), DAY_SLOT)).toBeCloseTo(58); // 60 idle min -> -12
  });
  it('uses the evening placeholder slot by default', () => {
    const recs = [block(at(2026, 10, 22, 10), 50)];
    expect(momentumNow(recs, at(2026, 10, 22, 17))).toBe(70);
    expect(momentumNow(recs, at(2026, 10, 22, 19))).toBeCloseTo(58);
  });
  it('does not decay overnight outside the slot', () => {
    const recs = [block(at(2026, 10, 21, 20), 60)]; // ends 21:00
    expect(momentumNow(recs, at(2026, 10, 22, 9), DAY_SLOT)).toBeCloseTo(50 + 24);
  });
});

describe('schedule', () => {
  it('counts slot minutes across days', () => {
    expect(minutesInSlots(at(2026, 10, 21, 20), at(2026, 10, 22, 10), [{ start: 540, end: 1260 }])).toBe(120);
  });
  it('sleep window crosses midnight', () => {
    expect(inWindow(at(2026, 10, 22, 23, 30), DEFAULT_SLEEP)).toBe(true);
    expect(inWindow(at(2026, 10, 22, 6), DEFAULT_SLEEP)).toBe(true);
    expect(inWindow(at(2026, 10, 22, 12), DEFAULT_SLEEP)).toBe(false);
  });
});

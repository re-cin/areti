import { addXp, xpForFocus, xpToNextLevel } from './xp';

describe('xp', () => {
  it('gives 1 XP per 5 minutes plus a completion bonus', () => {
    expect(xpForFocus(25 * 60, true)).toBe(10);
    expect(xpForFocus(12 * 60, false)).toBe(2);
    expect(xpForFocus(30, false)).toBe(0);
  });

  it('levels up and carries the remainder', () => {
    expect(xpToNextLevel(4)).toBe(500);
    expect(addXp(1, 190, 20)).toEqual({ level: 2, xp: 10 });
    expect(addXp(1, 0, 200 + 300 + 5)).toEqual({ level: 3, xp: 5 });
  });
});

import { addXp, creditedMinutes, creditWithDailyCap, xpForFocus, xpToNextLevel } from './xp';

describe('credited focus minutes', () => {
  it('credits whole minutes, only from 15 up', () => {
    expect(creditedMinutes(25 * 60)).toBe(25); // 25 min block, completed
    expect(creditedMinutes(40 * 60)).toBe(40); // 50 min block, cancelled at 40
    expect(creditedMinutes(15 * 60)).toBe(15); // cancelled at 15
    expect(creditedMinutes(14 * 60 + 59)).toBe(0); // cancelled at 14
    expect(creditedMinutes(20 * 60 + 59)).toBe(20); // rounded down
  });

  it('XP equals credited minutes', () => {
    expect(xpForFocus(25 * 60, true)).toBe(25);
    expect(xpForFocus(40 * 60, false)).toBe(40);
    expect(xpForFocus(14 * 60, false)).toBe(0);
  });

  it('caps credit at about 10 hours a day', () => {
    expect(creditWithDailyCap(25 * 60, 590)).toBe(10);
    expect(creditWithDailyCap(25 * 60, 600)).toBe(0);
    expect(creditWithDailyCap(25 * 60, 0)).toBe(25);
  });
});

describe('levels', () => {
  it('levels up and carries the remainder', () => {
    expect(xpToNextLevel(4)).toBe(500);
    expect(addXp(1, 190, 20)).toEqual({ level: 2, xp: 10 });
    expect(addXp(1, 0, 200 + 300 + 5)).toEqual({ level: 3, xp: 5 });
  });
});

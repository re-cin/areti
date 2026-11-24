import { creditedMinutes, creditWithDailyCap } from './xp';

describe('credited focus minutes', () => {
  it('credits every whole minute studied, also when a block ends early', () => {
    expect(creditedMinutes(25 * 60)).toBe(25); // 25 min block, finished
    expect(creditedMinutes(40 * 60)).toBe(40); // 50 min block, ended at 40
    expect(creditedMinutes(14 * 60 + 59)).toBe(14); // ended at 14:59
    expect(creditedMinutes(59)).toBe(0); // under a minute
  });

  it('caps credit at about 10 hours a day', () => {
    expect(creditWithDailyCap(25 * 60, 590)).toBe(10);
    expect(creditWithDailyCap(25 * 60, 600)).toBe(0);
    expect(creditWithDailyCap(25 * 60, 0)).toBe(25);
  });
});

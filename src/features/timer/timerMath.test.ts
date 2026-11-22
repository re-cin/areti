import { endsAtFrom, isFinished, remainingMs } from './timerMath';

describe('timer math', () => {
  it('derives remaining time from the clock', () => {
    const endsAt = endsAtFrom(1_000, 25 * 60_000);
    expect(remainingMs(endsAt, 1_000)).toBe(25 * 60_000);
    expect(remainingMs(endsAt, endsAt + 5)).toBe(0);
    expect(isFinished(endsAt, endsAt)).toBe(true);
  });
});

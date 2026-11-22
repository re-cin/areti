import { addDays, addMonths, monthLabel, monthWeeks, sameMonth, startOfDay, startOfWeek, weekDays, weekLabel } from './dates';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime();

describe('dates', () => {
  it('finds the Monday of a week', () => {
    expect(startOfWeek(d(2026, 9, 17))).toBe(d(2026, 9, 14));
    expect(startOfWeek(d(2026, 9, 20))).toBe(d(2026, 9, 14)); // Sunday belongs to the week before it
    expect(startOfWeek(d(2026, 9, 17), 0)).toBe(d(2026, 9, 13)); // Sunday-first
  });
  it('returns 7 days', () => {
    const days = weekDays(d(2026, 9, 14));
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(d(2026, 9, 20));
  });
  it('labels weeks by their 4th day', () => {
    expect(weekLabel(d(2026, 9, 14))).toBe('September Week 3');
    expect(weekLabel(d(2026, 9, 28))).toBe('October Week 1');
  });
  it('adds days across months', () => {
    expect(addDays(d(2026, 9, 30), 1)).toBe(d(2026, 10, 1));
    expect(startOfDay(new Date(2026, 8, 17, 15, 30))).toBe(d(2026, 9, 17));
  });
  it('builds a Monday-first month grid', () => {
    const weeks = monthWeeks(d(2026, 9, 14));
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe(d(2026, 8, 31));
    expect(weeks[4][6]).toBe(d(2026, 10, 4));
    expect(monthWeeks(d(2026, 3, 1))).toHaveLength(6); // March 2026 starts on a Sunday
  });
  it('moves by months and clamps the day', () => {
    expect(addMonths(d(2026, 1, 31), 1)).toBe(d(2026, 2, 28));
    expect(addMonths(d(2026, 9, 14), -1)).toBe(d(2026, 8, 14));
    expect(addMonths(d(2026, 12, 5), 1)).toBe(d(2027, 1, 5));
  });
  it('labels and compares months', () => {
    expect(monthLabel(d(2026, 9, 14))).toBe('September 2026');
    expect(sameMonth(d(2026, 9, 1), d(2026, 9, 30))).toBe(true);
    expect(sameMonth(d(2026, 9, 30), d(2026, 10, 1))).toBe(false);
  });
});

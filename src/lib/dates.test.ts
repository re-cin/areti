import { addDays, startOfDay, startOfWeek, weekDays, weekLabel } from './dates';

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
});

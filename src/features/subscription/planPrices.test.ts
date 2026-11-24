jest.mock('@/lib/supabase', () => ({ supabase: {}, supabaseConfigured: false }));

import { money, periodText, totalFor, type PlanPrice } from './planPrices';

const monthly: PlanPrice = { plan: 'monthly', label: 'Monthly plan', periodMonths: 1, periodDays: null, price: 180, currency: 'PHP', studentPrice: 80 };

describe('plan prices', () => {
  it('formats pesos with separators and only the decimals it needs', () => {
    expect(money(1199)).toBe('₱1,199');
    expect(money(99.9166)).toBe('₱99.92');
    expect(money(149)).toBe('₱149');
  });

  it('charges the student price only when asked for and set', () => {
    expect(totalFor(monthly, false)).toBe(180);
    expect(totalFor(monthly, true)).toBe(80);
    expect(totalFor({ ...monthly, studentPrice: null }, true)).toBe(180);
  });

  it('names plan lengths in months or days', () => {
    const m = (n: number) => ({ periodMonths: n, periodDays: null });
    const d = (n: number) => ({ periodMonths: null, periodDays: n });
    expect(periodText(m(1))).toBe('1 month');
    expect(periodText(m(12))).toBe('1 year');
    expect(periodText(m(6))).toBe('6 months');
    expect(periodText(m(24))).toBe('2 years');
    expect(periodText(d(7))).toBe('1 week');
    expect(periodText(d(14))).toBe('2 weeks');
    expect(periodText(d(10))).toBe('10 days');
  });
});

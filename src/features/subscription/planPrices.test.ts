jest.mock('@/lib/supabase', () => ({ supabase: {}, supabaseConfigured: false }));

import { money, periodText, totalFor, type PlanPrice } from './planPrices';

const monthly: PlanPrice = { plan: 'monthly', label: 'Monthly plan', periodMonths: 1, price: 180, currency: 'PHP', studentPrice: 80 };

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

  it('names plan lengths', () => {
    expect(periodText(1)).toBe('1 month');
    expect(periodText(12)).toBe('1 year');
    expect(periodText(6)).toBe('6 months');
    expect(periodText(24)).toBe('2 years');
  });
});

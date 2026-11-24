jest.mock('@/lib/supabase', () => ({ supabase: {}, supabaseConfigured: false }));

import { money, periodText, totalFor, type PlanPrice } from './planPrices';

const yearly: PlanPrice = { plan: 'yearly', label: 'Yearly plan', periodMonths: 12, price: 1199, currency: 'PHP', studentDiscountPercent: 20 };

describe('plan prices', () => {
  it('formats pesos with separators and only the decimals it needs', () => {
    expect(money(1199)).toBe('₱1,199');
    expect(money(99.9166)).toBe('₱99.92');
    expect(money(149)).toBe('₱149');
  });

  it('applies the student discount only when asked, rounded to centavos', () => {
    expect(totalFor(yearly, false)).toBe(1199);
    expect(totalFor(yearly, true)).toBe(959.2);
    expect(totalFor({ ...yearly, studentDiscountPercent: 0 }, true)).toBe(1199);
  });

  it('names plan lengths', () => {
    expect(periodText(1)).toBe('1 month');
    expect(periodText(12)).toBe('1 year');
    expect(periodText(6)).toBe('6 months');
    expect(periodText(24)).toBe('2 years');
  });
});

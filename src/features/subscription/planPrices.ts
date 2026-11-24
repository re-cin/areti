import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * Premium prices from the Supabase `plan_prices` table (one row per plan type).
 * Anyone can read the active rows; only admins can change them. The paypal-checkout
 * Edge Function reads the same table, so what the app shows is what PayPal charges.
 */

export type PlanType = 'monthly' | 'yearly';

export type PlanPrice = {
  plan: PlanType;
  label: string;
  periodMonths: number;
  price: number;
  currency: string;
  /** What students pay for this plan, or null when there is no student price. */
  studentPrice: number | null;
};

type Row = {
  plan: string;
  label: string;
  period_months: number;
  price: string | number;
  currency: string;
  student_price: string | number | null;
};

/** Active plans in display order. Empty when offline or not set up. */
export async function fetchPlanPrices(): Promise<PlanPrice[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('plan_prices')
    .select('plan, label, period_months, price, currency, student_price')
    .eq('active', true)
    .order('sort_order');
  if (error || !data) {
    if (__DEV__ && error) console.log('[plan_prices]', error.message);
    return [];
  }
  return (data as Row[])
    .filter((r) => r.plan === 'monthly' || r.plan === 'yearly')
    .map((r) => ({
      plan: r.plan as PlanType,
      label: r.label,
      periodMonths: r.period_months,
      price: Number(r.price),
      currency: r.currency,
      studentPrice: r.student_price === null ? null : Number(r.student_price),
    }));
}

/** What is charged: the student price when asked for and set (same rule as the server). */
export function totalFor(p: PlanPrice, student: boolean): number {
  return student && p.studentPrice !== null ? p.studentPrice : p.price;
}

const SYMBOL: Record<string, string> = { PHP: '₱', USD: '$', EUR: '€' };

/** "₱1,199" or "₱99.92": thousands separators, decimals only when needed. */
export function money(amount: number, currency = 'PHP'): string {
  const fixed = Math.round(amount * 100) / 100;
  const [whole, cents] = fixed.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = SYMBOL[currency] ?? `${currency} `;
  return `${symbol}${grouped}${cents === '00' ? '' : `.${cents}`}`;
}

/** "1 month", "1 year", "6 months". */
export function periodText(months: number): string {
  if (months === 12) return '1 year';
  if (months % 12 === 0) return `${months / 12} years`;
  return months === 1 ? '1 month' : `${months} months`;
}

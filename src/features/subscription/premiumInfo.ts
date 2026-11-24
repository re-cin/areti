import { getSetting } from '@/features/settings/settingsRepo';
import { parseSubscription, resolveTier, SUBSCRIPTION_SETTING_KEY } from './entitlements';

/** Premium status with its end date, from the phone's copy of the Supabase subscriptions row. */
export type PremiumInfo = { isPremium: boolean; expiresAt: number | null };

export const NOT_PREMIUM: PremiumInfo = { isPremium: false, expiresAt: null };

/** Reads the cached subscription (kept fresh by refreshSubscription in ./subscriptionRepo). */
export async function loadPremium(): Promise<PremiumInfo> {
  const raw = await getSetting<unknown>(SUBSCRIPTION_SETTING_KEY, null);
  const record = parseSubscription(raw === null ? null : JSON.stringify(raw));
  return { isPremium: resolveTier(record, Date.now()) === 'premium', expiresAt: record?.expiresAt ?? null };
}

/** "December 24, 2026" */
export const premiumDateText = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

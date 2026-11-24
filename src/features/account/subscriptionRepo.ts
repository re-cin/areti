import Storage from 'expo-sqlite/kv-store';
import { getSetting, SETTING_KEYS, setSetting } from '@/features/settings/settingsRepo';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { bumpData } from '@/stores/dataVersion';

/**
 * The signed-in user's Premium status, read from the cloud `subscriptions` table
 * (one row per user: plan, status, current_period_end).
 *
 * The table's rules only let users READ their own row; only admins can create or
 * change rows. So the app never upgrades anyone itself: Premium is granted on the
 * server (by an admin today, by a payment webhook later) and the app just reads it.
 *
 * No row means Free. Each answer is also saved on the phone (so it still shows offline) and
 * copied into the local plan value (profile.plan: 'pro' | 'free') that the PRO badge and the
 * Upgrade banner read. Supabase stays the source: the phone copies are only mirrors of it.
 */

export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired';

export type Subscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** Epoch ms, or null when there is no row. */
  startedAt: number | null;
  /** End of the paid (or trial) period, epoch ms. Null = no end date. */
  periodEnd: number | null;
  /** True when Premium features should be unlocked right now. */
  isPremium: boolean;
};

export const FREE_SUBSCRIPTION: Subscription = { plan: 'free', status: 'active', startedAt: null, periodEnd: null, isPremium: false };

type Row = { plan: string; status: string; started_at: string | null; current_period_end: string | null };

const cacheKey = (userId: string) => `areti.subscription.${userId}`;

/**
 * Premium is on when the plan is premium and the period has not ended:
 * active or trialing, or canceled but still inside the period already paid for.
 */
export function isPremiumNow(plan: string, status: string, periodEnd: number | null, now = Date.now()): boolean {
  if (plan !== 'premium') return false;
  if (status === 'expired') return false;
  if (periodEnd !== null && periodEnd <= now) return false;
  return status === 'active' || status === 'trialing' || status === 'canceled';
}

function fromRow(row: Row): Subscription {
  const plan: SubscriptionPlan = row.plan === 'premium' ? 'premium' : 'free';
  const status = (['active', 'trialing', 'canceled', 'expired'].includes(row.status) ? row.status : 'active') as SubscriptionStatus;
  const startedAt = row.started_at ? Date.parse(row.started_at) : null;
  const periodEnd = row.current_period_end ? Date.parse(row.current_period_end) : null;
  return { plan, status, startedAt, periodEnd, isPremium: isPremiumNow(plan, status, periodEnd) };
}

async function readCache(userId: string): Promise<Subscription | null> {
  try {
    const raw = await Storage.getItem(cacheKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Subscription;
    // Re-check the dates: a cached Premium can run out while offline.
    return { ...saved, isPremium: isPremiumNow(saved.plan, saved.status, saved.periodEnd) };
  } catch {
    return null;
  }
}

/** Copies the answer into the local plan value; refreshes screens only when it changed. */
async function mirrorLocalPlan(sub: Subscription) {
  const plan = sub.isPremium ? 'pro' : 'free';
  const saved = await getSetting<{ plan?: 'free' | 'pro' }>(SETTING_KEYS.profile, {});
  if (saved.plan === plan) return;
  await setSetting(SETTING_KEYS.profile, { ...saved, plan });
  bumpData();
}

/** The signed-in user's subscription. Free when signed out, not set up, or no row. */
export async function getSubscription(): Promise<Subscription> {
  if (!supabaseConfigured) return FREE_SUBSCRIPTION;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return FREE_SUBSCRIPTION;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, started_at, current_period_end')
    .eq('user_id', userId)
    .maybeSingle<Row>();

  if (error) {
    // Offline or the server is unreachable: use the last known answer.
    if (__DEV__) console.log('[subscription] using saved status:', error.message);
    const cached = await readCache(userId);
    if (cached) await mirrorLocalPlan(cached); // a saved Premium can run out while offline
    return cached ?? FREE_SUBSCRIPTION;
  }

  const sub = data ? fromRow(data) : FREE_SUBSCRIPTION;
  try {
    await Storage.setItem(cacheKey(userId), JSON.stringify(sub));
  } catch {
    // Caching is best-effort.
  }
  await mirrorLocalPlan(sub);
  return sub;
}

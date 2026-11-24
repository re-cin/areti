import { useEffect, useState } from 'react';
import { bumpData, useDataVersion } from '@/stores/dataVersion';
import { loadPremium, NOT_PREMIUM, type PremiumInfo } from './premiumInfo';
import { useNow } from './timeLeft';

/**
 * Live Premium status for the screen it is used on.
 * - Reloads the moment the phone's copy changes (an admin edit or a payment arrives through
 *   Supabase Realtime, see PremiumEndingReminders), because refreshSubscription bumps the data version.
 * - Ticks every second, so the countdown stays exact and a canceled Premium switches off right when it ends.
 */
export function usePremium(): PremiumInfo & { now: number } {
  // Not useDbQuery: that only reloads while the screen is focused, and a payment finishes while the
  // PayPal browser (or the paypal-return route) is on top. This reloads on every change, focused or not.
  const version = useDataVersion((st) => st.version);
  const [cached, setCached] = useState<PremiumInfo>(NOT_PREMIUM);
  useEffect(() => {
    let alive = true;
    loadPremium()
      .then((info) => alive && setCached(info))
      .catch((e) => console.warn('[subscription] Could not read Premium status', e));
    return () => {
      alive = false;
    };
  }, [version]);
  const now = useNow(1000);
  // Active subscriptions renew on their own, so only a canceled one switches off at its due time.
  const isPremium = cached.isPremium && (!cached.canceled || cached.expiresAt === null || cached.expiresAt > now);
  const justEnded = cached.isPremium && !isPremium;

  // Premium ran out while the screen was open: let the rest of the app (PRO badge, features) catch up.
  useEffect(() => {
    if (justEnded) bumpData();
  }, [justEnded]);

  return { ...cached, isPremium, now };
}

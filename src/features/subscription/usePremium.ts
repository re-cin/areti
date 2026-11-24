import { useEffect } from 'react';
import { useDbQuery } from '@/lib/useDbQuery';
import { bumpData } from '@/stores/dataVersion';
import { loadPremium, NOT_PREMIUM, type PremiumInfo } from './premiumInfo';
import { useNow } from './timeLeft';

/**
 * Live Premium status for the screen it is used on.
 * - Reloads the moment the phone's copy changes (an admin edit or a payment arrives through
 *   Supabase Realtime, see PremiumEndingReminders), because refreshSubscription bumps the data version.
 * - Ticks every second, so the countdown stays exact and Premium switches off right when it ends.
 */
export function usePremium(): PremiumInfo & { now: number } {
  const cached = useDbQuery(loadPremium, NOT_PREMIUM);
  const now = useNow(1000);
  const isPremium = cached.isPremium && (cached.expiresAt === null || cached.expiresAt > now);
  const justEnded = cached.isPremium && !isPremium;

  // Premium ran out while the screen was open: let the rest of the app (PRO badge, features) catch up.
  useEffect(() => {
    if (justEnded) bumpData();
  }, [justEnded]);

  return { ...cached, isPremium, now };
}

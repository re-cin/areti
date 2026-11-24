import { useEffect } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useDataVersion } from '@/stores/dataVersion';
import { showNotice } from '@/stores/notice';
import { loadPremium, premiumDateTimeText } from './premiumInfo';
import { refreshSubscription } from './subscriptionRepo';
import { schedulePremiumEndingNotifications } from './premiumNotifications';
import { dueReminder, msUntilNextCheck, type PremiumReminder } from './premiumReminders';
import { timeLeftText } from './timeLeft';

// Remember which reminders were shown for THIS end date, so a renewal (new end date) starts fresh.
const shownKey = (endMs: number) => `areti.premiumReminders.${endMs}`;
const MAX_WAIT = 6 * 60 * 60 * 1000; // re-check at least every 6 h while the app stays open
let checking = false; // one check at a time, so a reminder can't pop up twice

async function readShown(endMs: number): Promise<Set<PremiumReminder>> {
  try {
    const raw = await Storage.getItem(shownKey(endMs));
    return new Set(raw ? (JSON.parse(raw) as PremiumReminder[]) : []);
  } catch {
    return new Set();
  }
}

async function markShown(endMs: number, shown: Set<PremiumReminder>) {
  try {
    await Storage.setItem(shownKey(endMs), JSON.stringify([...shown]));
  } catch {
    // Best effort: at worst the reminder shows once more.
  }
}

/**
 * Listens to the signed-in user's row in the Supabase `subscriptions` table (Realtime), so an
 * admin edit or a PayPal payment reaches the phone within a second or two instead of at the next
 * sync. Each change refreshes the cached plan, which re-runs the reminder check below.
 */
function useLiveSubscription() {
  useEffect(() => {
    if (!supabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const listen = (userId: string | undefined) => {
      if (channel) void supabase.removeChannel(channel);
      channel = null;
      if (!userId) return;
      channel = supabase
        .channel(`subscription:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` },
          () => void refreshSubscription(),
        )
        .subscribe();
    };

    supabase.auth.getSession().then(({ data }) => listen(data.session?.user.id));
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => listen(session?.user.id));
    // Coming back from the background: the live connection may have dropped, so ask once.
    const app = AppState.addEventListener('change', (state) => state === 'active' && void refreshSubscription());
    return () => {
      auth.subscription.unsubscribe();
      app.remove();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);
}

/**
 * For a CANCELED subscription only: pop-ups "24 hours left" and "1 hour left", each once per due time,
 * plus the same two as phone notifications (they arrive even when the app is closed).
 * Active subscriptions get neither.
 * Checks when the app starts, comes back to the foreground, after a sync, and right at each
 * reminder moment while the app is open. Mounted once in the root layout; draws nothing itself.
 */
export function PremiumEndingReminders() {
  useLiveSubscription();
  const version = useDataVersion((s) => s.version); // re-check after syncs / admin changes

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        await runCheck();
      } finally {
        checking = false;
      }
    };

    const runCheck = async () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const premium = await loadPremium();
      // Only a canceled subscription actually ends, so only then is there anything to remind about.
      const ending = premium.isPremium && premium.canceled && premium.expiresAt ? premium.expiresAt : null;
      await schedulePremiumEndingNotifications(ending);
      if (!alive || ending === null) return;
      const end = ending;
      const now = Date.now();

      const shown = await readShown(end);
      const due = dueReminder(end, now, shown);
      if (due && alive) {
        // The 1-hour reminder also covers the 24-hour one.
        shown.add(due);
        if (due === '1h') shown.add('24h');
        await markShown(end, shown);
        showNotice({
          title: due === '1h' ? '1 hour of Premium left' : '24 hours of Premium left',
          message: `Your subscription was canceled, so Premium ends ${premiumDateTimeText(end)} (${timeLeftText(end, now)}).`,
          icon: 'crown',
          buttonLabel: 'OK',
        });
      }

      const wait = msUntilNextCheck(end, Date.now());
      if (wait !== null && alive) timer = setTimeout(check, Math.min(wait + 1000, MAX_WAIT));
    };

    void check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && void check());
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [version]);

  return null;
}

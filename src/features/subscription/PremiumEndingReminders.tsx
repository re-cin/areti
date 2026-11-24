import { useEffect } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { router } from 'expo-router';
import { useDataVersion } from '@/stores/dataVersion';
import { showNotice } from '@/stores/notice';
import { loadPremium, premiumDateTimeText } from './premiumInfo';
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
 * Pop-ups for Premium users: "24 hours left" and "1 hour left", each once per Premium period.
 * Checks when the app starts, comes back to the foreground, after a sync, and right at each
 * reminder moment while the app is open. Mounted once in the root layout; draws nothing itself.
 */
export function PremiumEndingReminders() {
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
      if (!alive || !premium.isPremium || !premium.expiresAt) return;
      const end = premium.expiresAt;
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
          message: `Your Premium ends ${premiumDateTimeText(end)} (${timeLeftText(end, now)}). Renew to keep it going.`,
          icon: 'crown',
          buttonLabel: 'Renew',
          cancelLabel: 'Later',
          onPress: () => router.push('/settings/subscription'),
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

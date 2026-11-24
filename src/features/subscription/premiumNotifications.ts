// expo-notifications is loaded lazily: importing it directly crashes Expo Go on Android.
// See src/lib/notificationPermission.ts. In Expo Go on Android these calls do nothing.
import { Platform } from 'react-native';
import { loadNotifications } from '@/lib/notificationPermission';
import { configureNotifications } from '@/features/timer/notifications';
import { premiumDateTimeText } from './premiumInfo';
import { REMINDER_AT, type PremiumReminder } from './premiumReminders';

const PREFIX = 'premium:';
const CHANNEL_ID = 'premium';

let lastPlanned: string | null = null; // skip re-scheduling when nothing changed

/**
 * Phone notifications 24 hours and 1 hour before a canceled Premium ends. They are scheduled
 * ahead of time, so they arrive even when the app is closed. Pass null (not canceled, Free,
 * or no due time) to remove them. Never asks for permission; it uses what the user already allowed.
 */
export async function schedulePremiumEndingNotifications(endMs: number | null): Promise<void> {
  const plan = endMs === null ? 'none' : String(endMs);
  if (plan === lastPlanned) return;
  const Notifications = loadNotifications();
  if (!Notifications) return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    lastPlanned = plan;
    if (endMs === null) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      lastPlanned = null; // try again later, e.g. after the user allows notifications
      return;
    }
    await configureNotifications();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Premium',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const now = Date.now();
    for (const id of Object.keys(REMINDER_AT) as PremiumReminder[]) {
      const at = endMs - REMINDER_AT[id];
      if (at <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${id}`,
        content: {
          title: id === '1h' ? '1 hour of Premium left' : '24 hours of Premium left',
          body: `Your Premium ends ${premiumDateTimeText(endMs)}.`,
          sound: true,
          data: { kind: 'premium' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
      });
    }
  } catch (e) {
    lastPlanned = null;
    console.warn('[subscription] Could not schedule Premium reminders', e);
  }
}

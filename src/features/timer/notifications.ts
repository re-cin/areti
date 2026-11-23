import { loadNotifications } from '@/lib/notificationPermission';
import { Platform } from 'react-native';
import type { PhaseEnd } from './session';

// Local notifications for the end of each timer phase. They fire even when the app is
// closed, because they are scheduled up front with the exact end time.
// Missing native modules are handled before loading the package, so unsupported
// Expo Go builds can still open the app and run the timer without notifications.

const CHANNEL_ID = 'timer';
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let configured = false;

async function configure(Notifications: NonNullable<Awaited<ReturnType<typeof loadNotifications>>>) {
  if (!supported || configured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Timer',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  configured = true;
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  const Notifications = await loadNotifications();
  if (!Notifications) return 'unsupported';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionState;
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  const Notifications = await loadNotifications();
  if (!Notifications) return 'unsupported';
  try {
    await configure(Notifications);
    const { status } = await Notifications.requestPermissionsAsync();
    return status as PermissionState;
  } catch {
    return 'unsupported';
  }
}

function message(end: PhaseEnd): { title: string; body: string } {
  if (!end.next) return { title: 'Session complete 🎉', body: 'Great work! Reti earned some XP.' };
  if (end.ended.phase === 'focus') {
    const long = end.next.phase === 'longBreak';
    return { title: long ? 'Time for a long break' : 'Time for a break', body: 'Focus block done. Stretch, drink some water.' };
  }
  return { title: 'Back to focus', body: `Block ${end.next.completedBlocks + 1} of ${end.next.totalBlocks} is starting.` };
}

/** Replaces any scheduled timer notifications with one per upcoming phase end. */
export async function scheduleTimerNotifications(timeline: PhaseEnd[]): Promise<void> {
  if (!supported) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await configure(Notifications);
    await Notifications.cancelAllScheduledNotificationsAsync();
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const now = Date.now();
    for (const end of timeline) {
      if (end.endedAt <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: { ...message(end), sound: true }, // phone's default sound (custom sounds need a dev build)
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: end.endedAt, channelId: CHANNEL_ID },
      });
    }
  } catch (e) {
    console.warn('[notifications]', e);
  }
}

export async function cancelTimerNotifications(): Promise<void> {
  if (!supported) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[notifications]', e);
  }
}

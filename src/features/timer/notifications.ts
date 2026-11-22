import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PhaseEnd } from './session';

// Local notifications for the end of each timer phase. They fire even when the app is
// closed, because they are scheduled up front with the exact end time.
// Works in Expo Go (local notifications only); behaviour is closer to the shipped app in a dev build.

const CHANNEL_ID = 'timer';
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let configured = false;

async function configure() {
  if (!supported || configured) return;
  configured = true;
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
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionState;
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    await configure();
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
  try {
    await configure();
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
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[notifications]', e);
  }
}

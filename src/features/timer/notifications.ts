// expo-notifications is loaded lazily: importing it directly crashes Expo Go on Android
// ("Cannot find native module 'ExpoTopicSubscriptionModule'"). See src/lib/notificationPermission.ts.
import { loadNotifications, notificationsAvailable } from '@/lib/notificationPermission';
import { Platform } from 'react-native';
import type { PhaseEnd } from './session';
import { playChime } from '@/features/audio/playChime';

// Local notifications for the end of each timer phase. They fire even when the app is
// closed, because they are scheduled up front with the exact end time.
// Works in Expo Go (local notifications only); behaviour is closer to the shipped app in a dev build.

const CHANNEL_ID = 'timer';
const TIMER_PREFIX = 'timer:';
const REMINDER_PREFIX = 'reminder:';

let onPermissionGranted: (() => void) | null = null;
export function setOnPermissionGranted(fn: () => void) {
  onPermissionGranted = fn;
}

/** Called when a session reminder fires while the app is open (set by the root layout). */
let onReminderWhileOpen: ((title: string, body: string, openPomodoro: boolean) => void) | null = null;
export function setReminderPopup(fn: (title: string, body: string, openPomodoro: boolean) => void) {
  onReminderWhileOpen = fn;
}

/** Cancels only our scheduled notifications whose id starts with `prefix` (timer vs reminders). */
async function cancelWithPrefix(prefix: string) {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export type SessionReminder = {
  id: string;
  at: number;
  title: string;
  body: string;
  silent: boolean;
  /** Notification sound name (played in the app; the phone uses its default sound in Expo Go). */
  sound: string;
  volume: number;
  openPomodoro?: boolean;
};

/**
 * Replaces all "Pomodoro in 5 minutes" reminders with these. They fire even when the app is closed.
 * Silent sessions remind without a sound. (Custom sounds need a dev build; Expo Go uses the phone's default.)
 */
export async function scheduleSessionReminders(reminders: SessionReminder[]): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  if (!supported) return;
  try {
    await configure();
    await cancelWithPrefix(REMINDER_PREFIX);
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const now = Date.now();
    for (const r of reminders) {
      if (r.at <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${r.id}`,
        content: { title: r.title, body: r.body, sound: !r.silent, data: { kind: 'reminder', reminderId: r.id, openPomodoro: Boolean(r.openPomodoro), sound: r.sound, volume: r.volume } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL_ID },
      });
    }
  } catch (e) {
    console.warn('[notifications] reminders', e);
  }
}
// Checked without loading expo-notifications; the package loads on first use.
const supported = (Platform.OS === 'ios' || Platform.OS === 'android') && notificationsAvailable;
let configured = false;

/** Sets up the notification handler and Android channel once (shared with the Premium reminders). */
export async function configureNotifications() {
  return configure();
}

async function configure() {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  if (!supported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const data = n.request.content.data as { kind?: string; openPomodoro?: boolean; sound?: string; volume?: number } | undefined;
      // App open: a session reminder shows areti's own popup instead of the phone banner.
      if (data?.kind === 'reminder') {
        onReminderWhileOpen?.(n.request.content.title ?? 'Pomodoro soon', n.request.content.body ?? '', Boolean(data.openPomodoro));
        // The app plays the session's own sound (Soft Chime, Desk Bell…) instead of the phone's default.
        playChime(data.sound ?? 'Silent', data.volume ?? 80);
        return { shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
      }
      // App open: the Premium-ending reminder already shows as areti's own pop-up (PremiumEndingReminders).
      if (data?.kind === 'premium') {
        return { shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
      }
      return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false };
    },
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
  const Notifications = loadNotifications();
  if (!Notifications) return 'unsupported';
  if (!supported) return 'unsupported';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionState;
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  const Notifications = loadNotifications();
  if (!Notifications) return 'unsupported';
  if (!supported) return 'unsupported';
  try {
    await configure();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') onPermissionGranted?.();
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
  return { title: "Break's over", body: `Press play to start block ${end.next.completedBlocks + 1} of ${end.next.totalBlocks}.` };
}

/** Replaces any scheduled timer notifications with one per upcoming phase end. */
export async function scheduleTimerNotifications(timeline: PhaseEnd[], silent = false): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  if (!supported) return;
  try {
    await configure();
    await cancelWithPrefix(TIMER_PREFIX); // leaves session reminders alone
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const now = Date.now();
    for (const [i, end] of timeline.entries()) {
      if (end.endedAt <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${TIMER_PREFIX}${i}`,
        content: { ...message(end), sound: !silent }, // phone's default sound (custom sounds need a dev build); none when Silent
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
    await cancelWithPrefix(TIMER_PREFIX);
  } catch (e) {
    console.warn('[notifications]', e);
  }
}

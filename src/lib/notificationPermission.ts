import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Notification permission helpers that never crash the app.
 *
 * `expo-notifications` is loaded lazily (only when one of these runs), because in
 * Expo Go on Android simply importing it throws "Cannot find native module
 * 'ExpoTopicSubscriptionModule'". In a development or release build it works normally.
 */

type NotificationsModule = typeof import('expo-notifications');

/**
 * On Android, expo-notifications needs this native module the moment it is imported.
 * Expo Go doesn't ship it, so check that it exists (without throwing) before importing.
 */
const missingNativeModule =
  Platform.OS === 'android' && requireOptionalNativeModule('ExpoTopicSubscriptionModule') == null;

/** The expo-notifications module, or null where it can't load (e.g. Expo Go on Android). */
export function loadNotifications(): NotificationsModule | null {
  if (missingNativeModule) return null;
  try {
    // A guarded lazy require prevents native package initialization during route loading.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/** True if notifications can be used in this build. */
export const notificationsAvailable = !missingNativeModule;

/** Whether the user already allowed notifications. False if unknown or unavailable. */
export async function hasNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Shows the system prompt. Resolves true if the user allowed notifications. */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    console.warn('Notifications are not available in Expo Go on Android. Use a development build to test this.');
    return false;
  }
  try {
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

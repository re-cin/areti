import { router } from 'expo-router';
import { signOut } from '@/lib/auth';
import { useTimer } from '@/features/timer/timerStore';
import { showNotice } from '@/stores/notice';

/**
 * Asks "Sign out?" in areti's white popup (white Cancel, terracotta Sign Out), then clears the saved
 * session and shows the sign in screen. Used by every sign-out button (User Settings, Account Settings).
 */
export function confirmSignOut() {
  showNotice({
    title: 'Sign out?',
    message: 'Your data is saved to your account. Sign back in on any phone to get it.',
    cancelLabel: 'Cancel',
    buttonLabel: 'Sign Out',
    onPress: async () => {
      useTimer.getState().reset(); // stop this phone's running Pomodoro
      await signOut();
      // Clear the screen history so Back can't return into the app, then show sign in.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/auth');
    },
  });
}

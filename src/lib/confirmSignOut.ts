import { router } from 'expo-router';
import { Alert } from 'react-native';
import { signOut } from '@/lib/auth';

/**
 * Asks "Sign out?", then clears the saved session and shows the sign in screen.
 * Used by every sign-out button (User Settings profile card, Account Settings).
 */
export function confirmSignOut() {
  Alert.alert('Sign out?', 'Your data is saved to your account. Sign back in on any phone to get it.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign Out',
      style: 'destructive',
      onPress: async () => {
        await signOut();
        // Clear the screen history so Back can't return into the app, then show sign in.
        if (router.canDismiss()) router.dismissAll();
        router.replace('/auth');
      },
    },
  ]);
}

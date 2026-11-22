import { Alert } from 'react-native';
import { confirmSignOut } from '@/lib/confirmSignOut';

/** Sign-out buttons: asks "Sign out?", clears the session and shows the sign in screen (Ryan's auth). */
export const showSignOutInfo = () => confirmSignOut();

export const showComingSoon = (what: string) => Alert.alert(what, 'Coming in a later version of areti.');

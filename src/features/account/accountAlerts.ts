import { confirmSignOut } from '@/lib/confirmSignOut';
import { showNotice } from '@/stores/notice';

/** Sign-out buttons: asks "Sign out?" in areti's popup, then shows the sign in screen. */
export const showSignOutInfo = () => confirmSignOut();

/** "Coming soon" (Premium, Help & Support, …) in areti's white popup with a terracotta Okay. */
export const showComingSoon = (what: string) =>
  showNotice({ title: what, message: 'Coming in a later version of areti.' });

import { showNotice } from '@/stores/notice';

/**
 * "Welcome back!" pop-up, shown once the Planner is on screen after signing in.
 * (A new account gets the full welcome page instead: app/welcome.tsx.)
 */
export function showWelcome() {
  setTimeout(
    () =>
      showNotice({
        title: 'Welcome back!',
        message: 'Your study plans and progress are syncing to this phone.',
        buttonLabel: "Let's go",
      }),
    450,
  );
}

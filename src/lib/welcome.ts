import { showNotice } from '@/stores/notice';

/** Welcome pop-up shown once the Planner is on screen after creating an account or signing in. */
export function showWelcome(kind: 'new-account' | 'signed-in') {
  const welcome =
    kind === 'new-account'
      ? { title: 'Welcome to areti!', message: 'Your account is ready. Add your subjects and Reti will help you stay on track.' }
      : { title: 'Welcome back!', message: 'Your study plans and progress are syncing to this phone.' };
  setTimeout(() => showNotice({ ...welcome, buttonLabel: "Let's go" }), 450);
}

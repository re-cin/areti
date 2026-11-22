import { useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import { getSession } from '@/db/queries/accounts';

/**
 * Start route. Signed-in users go straight to the app; everyone else
 * sees the welcome + onboarding screens, which end on the sign in / sign up screen.
 * The splash screen stays on top while this check runs.
 */
export default function Index() {
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    getSession()
      .then((session) => setTarget(session ? '/planner' : '/onboarding'))
      .catch(() => setTarget('/onboarding'));
  }, []);

  if (!target) return null;
  return <Redirect href={target} />;
}

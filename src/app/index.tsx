import { Redirect } from 'expo-router';

// TODO: send first-time users to /onboarding (check a "onboarding done" setting in the database).
export default function Index() {
  return <Redirect href="/planner" />;
}

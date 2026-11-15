import { Stack } from 'expo-router';

// Stack inside the Pomodoro tab so the timer settings keep the tab bar visible.
export default function PomodoroLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

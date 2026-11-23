import { SplashOverlay } from '@/components/brand/SplashOverlay';
import { NoticeDialog } from '@/components/ui/NoticeDialog';
import { Text } from '@/components/ui/Text';
import { db } from '@/db/client';
import { AudioController } from '@/features/audio/AudioController';
import { useTimerDriver } from '@/features/timer/useTimerDriver';
import { colors } from '@/theme';
import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import migrations from '../../drizzle/migrations';
import { startAutoSync } from '@/sync/sync';
import { refreshSessionReminders } from '@/features/timer/reminders';
import { setOnPermissionGranted, setReminderPopup } from '@/features/timer/notifications';
import { isPomodoroVisible, showNotice } from '@/stores/notice';
import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold });
  const { success: dbReady, error: dbError } = useMigrations(db, migrations);

  // Restores a running Pomodoro and keeps it ticking on every screen.
  useTimerDriver(dbReady);

  const ready = Boolean((fontsLoaded || fontError) && (dbReady || dbError));

  // Sync with Supabase (when signed in) once the local database is ready.
  useEffect(() => {
    if (!dbReady) return;
    return startAutoSync();
  }, [dbReady]);

  // Which page is showing, read by the reminder popup below.
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // "Pomodoro in 5 minutes" reminders: schedule them, show areti's popup when one fires while the
  // app is open, and open the Pomodoro tab when one is tapped from the phone's notifications.
  useEffect(() => {
    if (!dbReady) return;
    setReminderPopup((title, message, openPomodoro) => {
      if (!openPomodoro) {
        showNotice({ title, message });
        return;
      }
      // Start time. Already on the Pomodoro page: no popup (the chime still plays).
      if (isPomodoroVisible() || pathRef.current.startsWith('/pomodoro')) return;
      // Elsewhere: show "Time to focus" first; Okay then fades over to the Pomodoro page
      // (closing any screen on top, e.g. Settings or Add Task).
      showNotice({
        title,
        message,
        onPress: () => {
          if (router.canDismiss()) router.dismissAll();
          router.navigate('/pomodoro');
        },
      });
    });
    setOnPermissionGranted(() => void refreshSessionReminders());
    void refreshSessionReminders();
    const tap = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data as { kind?: string } | undefined;
      if (data?.kind === 'reminder') router.navigate('/pomodoro');
    });
    return () => tap.remove();
  }, [dbReady]);
  // The splash overlay stays on top (and hides the native splash) until it has faded out.
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);
  const splash = splashDone ? null : (
    <SplashOverlay ready={ready} fontsLoaded={Boolean(fontsLoaded)} onFinish={finishSplash} />
  );

  let content = null;
  if (ready && dbError) {
    content = (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.page }}>
        <Text variant="heading">Database failed to start</Text>
        <Text>{dbError.message}</Text>
      </View>
    );
  } else if (ready) {
    content = (
      <>
        <StatusBar style="dark" />
        {/* Background sound during focus + chime when a phase ends */}
        <AudioController enabled={dbReady} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
          {/* Sign in fades its own content in (see auth.tsx), so no slide here. */}
          <Stack.Screen name="auth" options={{ animation: 'none' }} />
          <Stack.Screen name="forgot-password" />
          {/* Fades in out of the welcome screen's ghost zoom. */}
          <Stack.Screen name="onboarding/intro" options={{ animation: 'fade' }} />
        </Stack>
        <NoticeDialog />
      </>
    );
  }

  // The splash is always the last child, so it stays mounted (and on top) while
  // the app appears underneath it, then removes itself after fading out.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {content}
      {splash}
    </GestureHandlerRootView>
  );
}

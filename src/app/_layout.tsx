import { SplashOverlay } from '@/components/brand/SplashOverlay';
import { Text } from '@/components/ui/Text';
import { db } from '@/db/client';
import { AudioController } from '@/features/audio/AudioController';
import { useTimerDriver } from '@/features/timer/useTimerDriver';
import { useAutomaticSchedule } from '@/features/planner/useAutomaticSchedule';
import { colors } from '@/theme';
import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import migrations from '../../drizzle/migrations';
import { startAutoSync } from '@/sync/sync';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold });
  const { success: dbReady, error: dbError } = useMigrations(db, migrations);

  // Restores a running Pomodoro and keeps it ticking on every screen.
  useTimerDriver(dbReady);
  useAutomaticSchedule(dbReady);

  const ready = Boolean((fontsLoaded || fontError) && (dbReady || dbError));

  // Sync with Supabase (when signed in) once the local database is ready.
  useEffect(() => {
    if (!dbReady) return;
    return startAutoSync();
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
      </>
    );
  }

  // The splash is always the last child, so it stays mounted (and on top) while
  // the app appears underneath it, then removes itself after fading out.
  return (
    <>
      {content}
      {splash}
    </>
  );
}

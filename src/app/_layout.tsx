import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { db } from '@/db/client';
import { colors } from '@/theme';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold });
  const { success: dbReady, error: dbError } = useMigrations(db, migrations);

  const ready = (fontsLoaded || fontError) && (dbReady || dbError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.page }}>
        <Text variant="heading">Database failed to start</Text>
        <Text>{dbError.message}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import {
  hasNotificationPermission,
  notificationsAvailable,
  requestNotificationPermission,
} from '@/lib/notificationPermission';
import { colors, spacing } from '@/theme';

/** "Permissions" card: shows whether notifications are allowed, and lets the user allow them. */
export function PermissionsCard() {
  const [granted, setGranted] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    hasNotificationPermission().then(setGranted);
  }, []);

  // Check now, and again when coming back from the phone's Settings app.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const allow = async () => {
    const ok = await requestNotificationPermission();
    setGranted(ok);
    if (!ok && notificationsAvailable) {
      // Once denied, the phone won't show the prompt again; only its Settings app can change it.
      Alert.alert('Notifications are off', 'Turn on notifications for areti in your phone settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
    }
  };

  return (
    <NeoBox style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">Permissions</Text>
        <Text variant="caption" color={colors.muted}>
          Notifications for study reminders
        </Text>
      </View>
      <PermissionStatus granted={granted} onAllow={allow} />
    </NeoBox>
  );
}

function PermissionStatus({ granted, onAllow }: { granted: boolean | null; onAllow: () => void }) {
  if (granted === null) return null; // still checking
  if (granted) return <Badge label="Granted" backgroundColor={colors.ink} textColor={colors.white} />;
  if (!notificationsAvailable) return <Badge label="Unavailable" backgroundColor={colors.surface} textColor={colors.muted} />;
  return (
    <Pressable onPress={onAllow} hitSlop={8} accessibilityRole="button" accessibilityLabel="Allow notifications">
      <Badge label="Allow" backgroundColor={colors.buttonTeal} />
    </Pressable>
  );
}

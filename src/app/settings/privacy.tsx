import { useState } from 'react';
import { Alert, Linking, Pressable, Share, View } from 'react-native';
import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { useDbQuery } from '@/lib/useDbQuery';
import { syncNow } from '@/sync/sync';
import { clearStudyHistory, exportAllData } from '@/features/account/accountRepo';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from '@/features/timer/notifications';
import { borders, colors, fonts, radii, spacing } from '@/theme';

const PERMISSION_LABEL: Record<PermissionState, string> = {
  granted: 'Granted',
  denied: 'Denied',
  undetermined: 'Not asked',
  unsupported: 'Unavailable',
};

export default function PrivacyScreen() {
  const [refresh, setRefresh] = useState(0);
  const permission = useDbQuery(getNotificationPermission, 'undetermined' as PermissionState, refresh);

  const onPermission = async () => {
    if (permission === 'granted' || permission === 'unsupported') return;
    if (permission === 'denied') {
      Alert.alert('Notifications are off', 'Turn them on in your phone settings so the timer can tell you when a block ends.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    await requestNotificationPermission();
    setRefresh((r) => r + 1);
  };

  const [syncing, setSyncing] = useState(false);
  const onSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await syncNow(); // never throws; failed syncs retry automatically
    setSyncing(false);
    Alert.alert('Synced', 'Your progress is saved to your account. It also syncs automatically while the app is open.');
  };

  const onExport = async () => {
    try {
      const json = await exportAllData();
      await Share.share({ title: 'areti data export', message: json });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    }
  };

  const onClear = () =>
    Alert.alert(
      'Clear study history?',
      'This erases all logged focus sessions, so your statistics and streaks start again. Subjects, plans, settings and Reti’s level stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear history', style: 'destructive', onPress: () => void clearStudyHistory() },
      ],
    );

  const granted = permission === 'granted';

  return (
    <SettingsScaffold title="Privacy & Data">
      <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View>
            <Text style={{ fontFamily: fonts.semiBold }}>Permissions</Text>
            <Text variant="caption" color={colors.muted}>
              Notifications
            </Text>
          </View>
          <Pressable onPress={onPermission} accessibilityRole="button" accessibilityLabel={`Notifications ${PERMISSION_LABEL[permission]}`}>
            <View
              style={{
                backgroundColor: granted ? colors.ink : colors.surface,
                borderRadius: radii.pill,
                borderWidth: borders.thin,
                borderColor: colors.ink,
                paddingHorizontal: 12,
                paddingVertical: 3,
              }}>
              <Text variant="caption" color={granted ? colors.white : colors.ink} style={{ fontFamily: fonts.semiBold }}>
                {PERMISSION_LABEL[permission]}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>Cloud Sync</Text>
              <Text variant="caption" color={colors.muted}>
                • {syncing ? 'Syncing…' : 'On'}
              </Text>
            </View>
            <Text variant="caption" color={colors.muted}>
              Auto-sync progress to cloud servers
            </Text>
          </View>
          <IconButton icon="sync" backgroundColor={colors.terracotta} accessibilityLabel="Cloud sync" onPress={onSync} />
        </View>
      </NeoBox>

      <Text style={{ fontFamily: fonts.semiBold }} color={colors.muted}>
        Account Management
      </Text>

      <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>Export Data</Text>
            <Text variant="caption" color={colors.muted}>
              Download study schedules, timer history & pet logs
            </Text>
          </View>
          <IconButton icon="download" backgroundColor={colors.teal} accessibilityLabel="Export data" onPress={onExport} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>Clear study history</Text>
            <Text variant="caption" color={colors.muted}>
              Only erase your study logs
            </Text>
          </View>
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear history">
            {({ pressed }) => (
              <View style={{ transform: pressed ? [{ translateX: 3 }, { translateY: 3 }] : [] }}>
                <NeoBox shadow={!pressed} offset={3} radius={12} backgroundColor={colors.dangerSoft} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Icon name="trash" size={16} />
                  <Text variant="caption" style={{ fontFamily: fonts.medium, fontSize: 14 }}>
                    Clear History
                  </Text>
                </NeoBox>
              </View>
            )}
          </Pressable>
        </View>
      </NeoBox>
    </SettingsScaffold>
  );
}

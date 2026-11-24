import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { showNotice } from '@/stores/notice';
import { useTimer } from '@/features/timer/timerStore';
import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { useDbQuery } from '@/lib/useDbQuery';
import { shareTextFile } from '@/lib/exportFile';
import { syncNow, type SyncResult } from '@/sync/sync';
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

/** What to tell the user after tapping Cloud Sync, for each way a sync can end. */
const SYNC_NOTICE: Record<SyncResult, { title: string; message: string }> = {
  ok: { title: 'Synced', message: 'Your progress is saved to your account. It also syncs automatically while the app is open.' },
  offline: {
    title: "Couldn't sync",
    message: "Check your internet connection and try again. Your changes are safe on this phone and will sync once you're back online.",
  },
  error: {
    title: "Couldn't sync",
    message: 'Something went wrong on the server. Your changes are safe on this phone; areti will try again automatically.',
  },
  'signed-out': { title: 'Not signed in', message: 'Sign in to save your progress to your account.' },
  'not-configured': { title: 'Sync is off', message: 'This copy of areti is not connected to a server (missing Supabase settings).' },
};

export default function PrivacyScreen() {
  const [refresh, setRefresh] = useState(0);
  const permission = useDbQuery(getNotificationPermission, 'undetermined' as PermissionState, refresh);

  const onPermission = async () => {
    if (permission === 'granted' || permission === 'unsupported') return;
    if (permission === 'denied') {
      showNotice({
        title: 'Notifications are off',
        message: 'Turn them on in your phone settings so the timer can tell you when a block ends.',
        cancelLabel: 'Not now',
        buttonLabel: 'Open settings',
        onPress: () => void Linking.openSettings(),
      });
      return;
    }
    await requestNotificationPermission();
    setRefresh((r) => r + 1);
  };

  const [syncing, setSyncing] = useState(false);
  const onSync = async () => {
    if (syncing) return;
    setSyncing(true);
    const result = await syncNow(); // never throws; failed syncs also retry automatically
    setSyncing(false);
    showNotice(SYNC_NOTICE[result]);
  };

  const onExport = async () => {
    try {
      const json = await exportAllData();
      const day = new Date().toISOString().slice(0, 10); // e.g. 2026-11-23
      await shareTextFile(`areti-export-${day}.json`, json);
    } catch (e) {
      showNotice({ title: 'Export failed', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const onClear = () =>
    // areti's white popup: white Cancel, terracotta Clear history.
    showNotice({
      title: 'Clear study history?',
      message:
        'This erases all your exams and study plans, tasks, scheduled Pomodoro sessions and logged focus time, so your planner, statistics, streak and Reti’s level and XP start again, on every phone. Your subjects, Preferences and Pomodoro settings stay.',
      cancelLabel: 'Cancel',
      buttonLabel: 'Clear history',
      onPress: () => {
        useTimer.getState().reset(); // a running session would belong to the cleared history
        // Let the confirm popup close before showing the result.
        void clearStudyHistory()
          .then(count => setTimeout(() => showNotice({ title: 'Study history cleared',
            message: count === 0 ? 'There was nothing to clear.' : 'Your exams, tasks, sessions and focus history were erased.' }), 400))
          .catch(e => setTimeout(() => showNotice({ title: 'Could not clear history',
            message: e instanceof Error ? e.message : String(e) }), 400));
      },
    });

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
              Erase tasks, sessions and statistics
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

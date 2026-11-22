import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { clearStudyHistory, exportAllData } from '@/db/queries/privacy';
import { colors, spacing } from '@/theme';

/** "Account Management" heading with the Export Data and Clear study history rows. */
export function AccountManagementSection() {
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const json = await exportAllData();
      // Opens the phone's share sheet (save to Files, Drive, email, etc.).
      await Share.share({ title: 'areti data export', message: json });
    } catch {
      Alert.alert('Export failed', 'Something went wrong while exporting your data. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear study history?',
      'This erases your study logs (timer history). Your subjects, schedules, tasks and ghost stay. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: async () => {
            try {
              const count = await clearStudyHistory();
              Alert.alert(
                'Study history cleared',
                count === 0 ? 'There were no study logs to clear.' : `${count} study ${count === 1 ? 'log' : 'logs'} erased.`,
              );
            } catch {
              Alert.alert('Could not clear history', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="bodyStrong" color={colors.muted}>
        Account Management
      </Text>
      <NeoBox style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong">Export Data</Text>
            <Text variant="caption" color={colors.muted}>
              Download study schedules, timer history & pet logs
            </Text>
          </View>
          <IconButton
            icon="download"
            size={42}
            backgroundColor={colors.buttonTeal}
            onPress={exportData}
            accessibilityLabel="Export data"
          />
        </View>

        <View style={{ height: 1, backgroundColor: colors.divider }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong">Clear study history</Text>
            <Text variant="caption" color={colors.muted}>
              Only erase your study logs
            </Text>
          </View>
          <NeoButton
            label="Clear History"
            icon="trash"
            backgroundColor={colors.dangerSoft}
            onPress={confirmClear}
            contentStyle={{ paddingVertical: 8, paddingHorizontal: spacing.md, gap: 6 }}
          />
        </View>
      </NeoBox>
    </View>
  );
}

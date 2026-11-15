import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SelectField } from '@/components/pomodoro/SelectField';
import { Stepper } from '@/components/pomodoro/Stepper';
import { VolumeSlider } from '@/components/pomodoro/VolumeSlider';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { HeaderGear, ScreenHeader } from '@/components/ui/ScreenHeader';
import { TealBackdrop } from '@/components/ui/TealBackdrop';
import { Text } from '@/components/ui/Text';
import { mockPomodoroSettings as s } from '@/mocks/ui';
import { colors, spacing } from '@/theme';

// UI only: values come from mock data; steppers, dropdowns and sliders are not wired up.
export default function PomodoroSettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}>
        <TealBackdrop height={insets.top + 420} curve={0.6} />
        <ScreenHeader title="Settings" leading="back" trailing={<HeaderGear />} />

        <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
          <View>
            <Text variant="subheading" style={{ marginBottom: spacing.xs }}>
              Time Interval
            </Text>
            <Stepper label="Focus count" value={String(s.focusCount)} />
            <Stepper label="Focus time" value={`${s.focusMinutes} min`} />
            <Stepper label="Break time" value={`${s.breakMinutes} min`} />
            <Stepper label="Long break time" value={`${s.longBreakMinutes} min`} />
          </View>

          <View style={{ gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md }}>
            <Text variant="subheading">Audio & Ambience</Text>
            <View style={{ gap: spacing.sm }}>
              <Text variant="body">Background Sound</Text>
              <SelectField value={s.backgroundSound} />
            </View>
            <VolumeSlider label="Background Volume" value={s.backgroundVolume} />
            <View style={{ gap: spacing.sm }}>
              <Text variant="body">Notification Sound</Text>
              <SelectField value={s.notificationSound} />
            </View>
            <VolumeSlider label="Notification Volume" value={s.notificationVolume} />
          </View>
        </NeoBox>

        <NeoButton label="Save Settings" backgroundColor={colors.terracotta} />
      </ScrollView>
    </View>
  );
}

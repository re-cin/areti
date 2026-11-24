import { router } from 'expo-router';
import { View } from 'react-native';
import { HeaderGear, ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/theme';

/**
 * Top of the Planner. Same header as the Pomodoro screen (ScreenHeader + spacing),
 * so both tabs line up: avatar opens Account Settings, gear opens Settings.
 */
export function PlannerHeader() {
  return (
    <View style={{ paddingTop: spacing.md }}>
      <ScreenHeader
        title="Planner"
        leading="avatar"
        onAvatarPress={() => router.push('/settings/account')}
        // Gear opens Settings (same as Pomodoro and Statistics).
        trailing={<HeaderGear onPress={() => router.push('/settings')} />}
      />
    </View>
  );
}

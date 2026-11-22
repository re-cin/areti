import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumBanner } from '@/components/settings/PremiumBanner';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { SettingsMenu, type SettingsMenuItem } from '@/components/settings/SettingsMenu';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { confirmSignOut } from '@/lib/confirmSignOut';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { mockUser } from '@/mocks/ui';
import { colors, spacing } from '@/theme';

// UI only: menu rows don't navigate yet except the profile card and Data & Privacy.
const MENU: SettingsMenuItem[] = [
  { key: 'subjects', label: 'Subjects', icon: 'book' },
  { key: 'preferences', label: 'Preferences', icon: 'sliders' },
  { key: 'privacy', label: 'Data & Privacy', icon: 'shield', onPress: () => router.push('/settings/privacy') },
  { key: 'help', label: 'Help & Support', icon: 'help' },
  { key: 'terms', label: 'Terms & Policies', icon: 'info' },
];

export default function UserSettingsScreen() {
  const user = useCurrentUser();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="User Settings" leading="back" />
        <ProfileCard
          name={user?.name ?? ''}
          email={user?.email ?? ''}
          pictureUri={user?.pictureUri}
          onPress={() => router.push('/settings/account')}
          onSignOut={confirmSignOut}
        />
        <PremiumBanner />
        <SettingsMenu items={MENU} />

        <View style={{ flex: 1 }} />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.xl, alignItems: 'center' }}>
          <Text variant="small" color={colors.muted}>
            {mockUser.appVersion}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

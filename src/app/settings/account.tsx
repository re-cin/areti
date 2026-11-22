import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountInfoSection } from '@/components/settings/AccountInfoSection';
import { DangerZone } from '@/components/settings/DangerZone';
import { ProfileHeader } from '@/components/settings/ProfileHeader';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { confirmSignOut } from '@/lib/confirmSignOut';
import { mockUser } from '@/mocks/ui';
import { colors, spacing } from '@/theme';

// Only Sign Out is wired up so far; the other account actions are UI only.
export default function AccountSettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Account Settings" leading="back" />
        <ProfileHeader name={mockUser.name} joined={mockUser.joined} isPro={mockUser.isPro} />
        <AccountInfoSection email={mockUser.email} synced onSignOut={confirmSignOut} />
        <DangerZone />
      </ScrollView>
    </SafeAreaView>
  );
}

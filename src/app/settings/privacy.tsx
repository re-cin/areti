import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountManagementSection } from '@/components/settings/AccountManagementSection';
import { PermissionsCard } from '@/components/settings/PermissionsCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing } from '@/theme';

// Cloud Sync row is left out until syncing exists.
export default function PrivacyDataScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Privacy & Data" leading="back" />
        <PermissionsCard />
        <AccountManagementSection />
      </ScrollView>
    </SafeAreaView>
  );
}

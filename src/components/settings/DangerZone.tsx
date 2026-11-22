import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

/** Red "Danger Zone" heading with the Delete Account card. */
export function DangerZone({ onDelete, deleting }: { onDelete?: () => void; deleting?: boolean }) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name="alert" size={18} color={colors.dangerDark} />
        <Text variant="bodyStrong" color={colors.dangerDark}>
          Danger Zone
        </Text>
      </View>
      <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="subheading">Delete Account</Text>
          <Text variant="small" color={colors.muted}>
            Permanently delete your profile, study streaks, and all logged focus cycles. This cannot be undone.
          </Text>
        </View>
        <NeoButton
          label={deleting ? 'DELETING…' : 'DELETE EVERYTHING'}
          disabled={deleting}
          icon="trash"
          textVariant="label"
          backgroundColor={colors.dangerButton}
          onPress={onDelete}
        />
      </NeoBox>
    </View>
  );
}

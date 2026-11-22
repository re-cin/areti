import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

type Props = { email: string; synced?: boolean; onEmailPress?: () => void; onSignOut?: () => void };

/** "Account Information" heading, email card and sign-out card. */
export function AccountInfoSection({ email, synced, onEmailPress, onSignOut }: Props) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="bodyStrong" color={colors.muted} style={{ flex: 1 }}>
          Account Information
        </Text>
        {synced && <Badge label="Synced" />}
      </View>

      <Pressable onPress={onEmailPress} accessibilityRole="button">
        <NeoBox style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color={colors.muted}>
              Email
            </Text>
            <Text variant="bodyStrong">{email}</Text>
          </View>
          <Icon name="chevron-right" size={18} strokeWidth={2.4} />
        </NeoBox>
      </Pressable>

      <NeoBox style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Sign Out</Text>
          <Text variant="caption" color={colors.muted}>
            Switch accounts or end session
          </Text>
        </View>
        <IconButton icon="log-out" size={42} backgroundColor={colors.dangerSoft} onPress={onSignOut} accessibilityLabel="Sign out" />
      </NeoBox>
    </View>
  );
}

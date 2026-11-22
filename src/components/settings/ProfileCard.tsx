import { Pressable, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

type Props = { name: string; email: string; pictureUri?: string | null; onPress?: () => void; onSignOut?: () => void };

/** User Settings: avatar, name, email and a sign-out button. Tapping opens Account Settings. */
export function ProfileCard({ name, email, pictureUri, onPress, onSignOut }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Account settings">
      <NeoBox style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
        <Avatar size={52} uri={pictureUri} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading" style={{ textTransform: 'uppercase' }} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="small" color={colors.muted} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <IconButton icon="log-out" size={44} backgroundColor={colors.dangerSoft} onPress={onSignOut} accessibilityLabel="Sign out" />
      </NeoBox>
    </Pressable>
  );
}

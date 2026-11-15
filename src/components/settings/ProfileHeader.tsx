import { Pressable, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

type Props = {
  name: string;
  joined: string;
  isPro?: boolean;
  onEditPhoto?: () => void;
  onEditName?: () => void;
};

/** Account Settings top block: big avatar with camera badge, name + pencil, PRO tag, join date. */
export function ProfileHeader({ name, joined, isPro, onEditPhoto, onEditName }: Props) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Avatar size={80} editable onPress={onEditPhoto} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
        <Text variant="heading">{name}</Text>
        <Pressable onPress={onEditName} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit name">
          <Icon name="pencil" size={16} color={colors.muted} />
        </Pressable>
      </View>
      {isPro && (
        <View style={{ alignSelf: 'center' }}>
          <Badge label="PRO" backgroundColor={colors.ink} textColor={colors.white} icon="crown" iconColor={colors.gold} />
        </View>
      )}
      <Text variant="small" color={colors.muted}>
        {joined}
      </Text>
    </View>
  );
}

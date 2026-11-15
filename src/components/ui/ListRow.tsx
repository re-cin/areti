import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { borders, colors, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  /** Draw the divider above this row (every row except the first). */
  divider?: boolean;
  trailing?: ReactNode;
};

/** Menu row: optional icon, label, chevron. Used inside a NeoBox list card. */
export function ListRow({ label, icon, onPress, divider, trailing }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg + 2,
        borderTopWidth: divider ? borders.thin : 0,
        borderTopColor: colors.ink,
        backgroundColor: pressed ? colors.page : 'transparent',
      })}>
      {icon && <Icon name={icon} size={20} />}
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </Text>
      {trailing ?? (
        <View>
          <Icon name="chevron-right" size={18} strokeWidth={2.6} />
        </View>
      )}
    </Pressable>
  );
}

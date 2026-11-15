import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

type Props = {
  label: string;
  value: string;
  onDecrement?: () => void;
  onIncrement?: () => void;
  divider?: boolean;
};

/** "Focus time   < 60 min >" settings row. */
export function Stepper({ label, value, onDecrement, onIncrement, divider = true }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.divider,
      }}>
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <Pressable onPress={onDecrement} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Decrease ${label}`}>
        <Icon name="chevron-left" size={18} strokeWidth={2.6} />
      </Pressable>
      <Text variant="smallStrong" style={{ minWidth: 64, textAlign: 'center' }}>
        {value}
      </Text>
      <Pressable onPress={onIncrement} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Increase ${label}`}>
        <Icon name="chevron-right" size={18} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

import { Pressable, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  accessibilityLabel: string;
};

/** "<  60 min  >" */
export function Stepper({ value, onChange, min, max, step = 1, format = String, accessibilityLabel }: Props) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} accessibilityLabel={accessibilityLabel}>
      <Pressable onPress={dec} disabled={value <= min} hitSlop={10} accessibilityLabel={`Decrease ${accessibilityLabel}`}>
        <Icon name="chevronLeft" size={18} strokeWidth={2.5} color={value <= min ? colors.mutedSoft : colors.ink} />
      </Pressable>
      <Text variant="bodyStrong" style={{ minWidth: 64, textAlign: 'center', fontFamily: fonts.semiBold }}>
        {format(value)}
      </Text>
      <Pressable onPress={inc} disabled={value >= max} hitSlop={10} accessibilityLabel={`Increase ${accessibilityLabel}`}>
        <Icon name="chevronRight" size={18} strokeWidth={2.5} color={value >= max ? colors.mutedSoft : colors.ink} />
      </Pressable>
    </View>
  );
}

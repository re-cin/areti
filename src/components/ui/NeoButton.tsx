import { Pressable, View } from 'react-native';
import { borders, colors, radii, spacing } from '@/theme';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

type Props = {
  label: string;
  onPress?: () => void;
  backgroundColor?: string;
  disabled?: boolean;
};

export function NeoButton({ label, onPress, backgroundColor = colors.teal, disabled }: Props) {
  const offset = borders.shadowOffset;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}>
      {({ pressed }) => (
        <View style={{ opacity: disabled ? 0.5 : 1, transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            radius={radii.button}
            backgroundColor={backgroundColor}
            style={{ paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, alignItems: 'center' }}>
            <Text variant="heading">{label}</Text>
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}

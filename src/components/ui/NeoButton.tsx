import { Pressable, View } from 'react-native';
import { borders, colors, radii, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

type Props = {
  label: string;
  onPress?: () => void;
  backgroundColor?: string;
  disabled?: boolean;
  /** Optional icon shown before the label. */
  icon?: IconName;
  /** "label" renders small uppercase text (e.g. DELETE EVERYTHING). */
  textVariant?: 'heading' | 'subheading' | 'label';
};

export function NeoButton({
  label,
  onPress,
  backgroundColor = colors.teal,
  disabled,
  icon,
  textVariant = 'heading',
}: Props) {
  const offset = borders.shadowOffset;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}>
      {({ pressed }) => (
        <View style={{ opacity: disabled ? 0.5 : 1, transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            radius={radii.button}
            backgroundColor={backgroundColor}
            style={{
              paddingVertical: spacing.md + 2,
              paddingHorizontal: spacing.xl,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: spacing.sm,
            }}>
            {icon && <Icon name={icon} size={textVariant === 'label' ? 16 : 20} />}
            <Text variant={textVariant} style={textVariant === 'label' ? { fontSize: 13 } : undefined}>
              {label}
            </Text>
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}

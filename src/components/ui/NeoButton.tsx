import { borders, colors, radii, spacing } from '@/theme';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

type Props = {
  label: string;
  onPress?: () => void;
  backgroundColor?: string;
  /** Label color. Defaults to ink. */
  textColor?: string;
  /** Shadow color. Defaults to ink. */
  shadowColor?: string;
  /** Optional icon shown before the label. */
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Applied to the outer Pressable (e.g. `{ flex: 1 }` in a row). */
  style?: StyleProp<ViewStyle>;
};

export function NeoButton({
  label,
  onPress,
  backgroundColor = colors.teal,
  textColor = colors.ink,
  shadowColor = colors.ink,
  icon,
  disabled,
  style,
}: Props) {
  const offset = borders.shadowOffset;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={style}
      accessibilityRole="button"
      accessibilityState={{ disabled }}>
      {({ pressed }) => (
        <View style={{ opacity: disabled ? 0.5 : 1, transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            shadowColor={shadowColor}
            radius={radii.button}
            backgroundColor={backgroundColor}
            style={{
              paddingVertical: spacing.md -1,
              paddingHorizontal: spacing.xl,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}>
            {icon}
            <Text variant="subheading" color={textColor}>
              {label}
            </Text>
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}
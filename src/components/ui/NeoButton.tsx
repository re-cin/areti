import { borders, colors, radii, spacing } from '@/theme';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
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
  /** Optional icon shown before the label: an icon name, or any element. */
  icon?: IconName | React.ReactNode;
  disabled?: boolean;
  /** "label" renders small uppercase text (e.g. DELETE EVERYTHING). */
  textVariant?: 'heading' | 'subheading' | 'label';
  /** Applied to the outer Pressable (e.g. `{ flex: 1 }` in a row). */
  style?: StyleProp<ViewStyle>;
  /** Applied to the button face, e.g. `{ paddingVertical: 15 }` for a taller button. */
  contentStyle?: StyleProp<ViewStyle>;
};

export function NeoButton({
  label,
  onPress,
  backgroundColor = colors.teal,
  textColor = colors.ink,
  shadowColor = colors.ink,
  icon,
  disabled,
  textVariant = 'subheading',
  style,
  contentStyle,
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
            style={[
              {
                paddingVertical: spacing.md - 1,
                paddingHorizontal: spacing.xl,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              },
              contentStyle,
            ]}>
            {typeof icon === 'string' ? (
              <Icon name={icon as IconName} size={textVariant === 'label' ? 16 : 20} />
            ) : (
              icon
            )}
            <Text
              variant={textVariant}
              color={textColor}
              style={textVariant === 'label' ? { fontSize: 13 } : undefined}>
              {label}
            </Text>
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}

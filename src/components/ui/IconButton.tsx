import { Pressable, View } from 'react-native';
import { borders, colors } from '@/theme';
import { Icon, type IconName } from './Icon';
import { NeoBox } from './NeoBox';

type Props = {
  icon: IconName;
  onPress?: () => void;
  backgroundColor?: string;
  size?: number;
  iconSize?: number;
  radius?: number;
  accessibilityLabel: string;
  disabled?: boolean;
};

/** Square outlined button with a hard shadow (timer controls, card actions). */
export function IconButton({
  icon,
  onPress,
  backgroundColor = colors.surface,
  size = 40,
  iconSize,
  radius = 12,
  accessibilityLabel,
  disabled,
}: Props) {
  const offset = size >= 56 ? borders.shadowOffset : 3;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={6}>
      {({ pressed }) => (
        <View style={{ opacity: disabled ? 0.5 : 1, transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            offset={offset}
            radius={radius}
            backgroundColor={backgroundColor}
            style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={iconSize ?? Math.round(size * 0.45)} />
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}

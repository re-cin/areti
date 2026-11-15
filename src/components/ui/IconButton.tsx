import { Pressable, View } from 'react-native';
import { borders, colors, radii } from '@/theme';
import { Icon, type IconName } from './Icon';
import { NeoBox } from './NeoBox';

type Props = {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  backgroundColor?: string;
  radius?: number;
  accessibilityLabel: string;
};

/** Square neo-brutalist button holding a single icon (timer controls, sign out). */
export function IconButton({
  icon,
  onPress,
  size = 56,
  iconSize,
  backgroundColor = colors.surface,
  radius = radii.button,
  accessibilityLabel,
}: Props) {
  const offset = borders.shadowOffset;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {({ pressed }) => (
        <View style={{ transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            radius={radius}
            backgroundColor={backgroundColor}
            style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={iconSize ?? Math.round(size * 0.42)} strokeWidth={2.4} />
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}

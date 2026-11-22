import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';

/** Dropdown-looking field. Opening a picker is not wired up yet. */
export function SelectField({ value, onPress }: { value: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <NeoBox
        radius={radii.button}
        offset={borders.smallShadowOffset + 1}
        backgroundColor={colors.surface}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 }}>
        <Text variant="smallStrong" style={{ flex: 1, fontSize: 15 }}>
          {value}
        </Text>
        <View>
          <Icon name="chevron-down" size={20} strokeWidth={2.4} />
        </View>
      </NeoBox>
    </Pressable>
  );
}

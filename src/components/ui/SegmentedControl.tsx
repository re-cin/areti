import { Pressable, View } from 'react-native';
import { borders, colors, radii, spacing } from '@/theme';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

type Props<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

/** Pill-shaped tab switcher (Week / Month / All Time). */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderWidth: borders.thin,
        borderColor: colors.ink,
        borderRadius: radii.pill,
        padding: 3,
      }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{ flex: 1 }}>
            {selected ? (
              <NeoBox
                radius={radii.pill}
                offset={borders.smallShadowOffset}
                backgroundColor={colors.teal}
                style={{ paddingVertical: spacing.xs + 1, alignItems: 'center' }}>
                <Text variant="bodyStrong">{option}</Text>
              </NeoBox>
            ) : (
              <View style={{ paddingVertical: spacing.xs + 3, alignItems: 'center' }}>
                <Text variant="body" color={colors.muted}>
                  {option}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

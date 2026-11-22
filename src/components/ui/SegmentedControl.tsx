import { Pressable, View } from 'react-native';
import { borders, colors, radii, spacing } from '@/theme';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

// Accepts either { value, label } objects (Statistics) or plain strings (Ryan's auth screen).
type Props<T extends string> = {
  value: T;
  options: readonly { value: T; label: string }[] | readonly T[];
  onChange: (v: T) => void;
};

/** Pill-shaped tab switch (Week | Month | All Time). The active option is a teal pill. */
export function SegmentedControl<T extends string>({ value, options, onChange }: Props<T>) {
  if (options.length > 0 && typeof options[0] === 'string') {
    return <StringSegmented value={value} options={options as readonly T[]} onChange={onChange} />;
  }
  const items = options as readonly { value: T; label: string }[];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        borderWidth: borders.thin,
        borderColor: colors.ink,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
        padding: 3,
      }}>
      {items.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: radii.pill,
              backgroundColor: active ? colors.teal : 'transparent',
              borderWidth: active ? borders.thin : 0,
              borderColor: colors.ink,
            }}>
            <Text variant={active ? 'bodyStrong' : 'body'} color={active ? colors.ink : colors.muted} style={{ fontSize: 17 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Ryan's version, used when the options are plain strings. */
function StringSegmented<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
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

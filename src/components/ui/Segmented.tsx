import { colors, radii } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

export type SegmentOption<T extends string> = {
  key: T;
  label: string;
  /** Optional Ionicons name shown before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Relative width inside the row. Defaults to 1. */
  flex?: number;
};

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
};

const OFFSET = 2;

/** Row of pill buttons; the selected one is filled with ink. Pills sink when pressed. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const selected = o.key === value;
        const fg = selected ? colors.white : colors.ink;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{ flex: o.flex ?? 1 }}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            {({ pressed }) => (
              <View style={{ transform: pressed ? [{ translateX: OFFSET }, { translateY: OFFSET }] : [] }}>
                <NeoBox
                  offset={OFFSET}
                  shadow={!pressed}
                  radius={radii.pill}
                  backgroundColor={selected ? colors.ink : colors.surface}
                  style={styles.pill}>
                  {o.icon ? <Ionicons name={o.icon} size={14} color={fg} /> : null}
                  <Text variant="smallStrong" color={fg} numberOfLines={1}>{o.label}</Text>
                </NeoBox>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
});
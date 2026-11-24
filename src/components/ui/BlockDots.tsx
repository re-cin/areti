import { View } from 'react-native';
import { borders, colors } from '@/theme';

/** One rounded square per focus block. Black = finished, white = not finished yet. */
export function BlockDots({ total, filled, size = 22 }: { total: number; filled: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }} accessibilityLabel={`Block ${filled} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ marginRight: 2, marginBottom: 2 }}>
          <View
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: size,
              height: size * 0.82,
              borderRadius: 7,
              backgroundColor: colors.ink,
            }}
          />
          <View
            style={{
              width: size,
              height: size * 0.82,
              borderRadius: 7,
              borderWidth: borders.thin,
              borderColor: colors.ink,
              backgroundColor: i < filled ? colors.ink : colors.white,
            }}
          />
        </View>
      ))}
    </View>
  );
}

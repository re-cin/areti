import { View } from 'react-native';
import { NeoBox } from '@/components/ui/NeoBox';
import { borders, colors, spacing } from '@/theme';

type Props = {
  total: number;
  /** Index of the block currently running, or -1 when idle. */
  active?: number;
  /** "pill" = the wide dots on the expanded sheet view. */
  shape?: 'square' | 'pill';
};

/** Row of Pomodoro blocks; the running one is filled black. */
export function BlockDots({ total, active = -1, shape = 'square' }: Props) {
  const width = shape === 'pill' ? 26 : 22;
  const height = shape === 'pill' ? 12 : 22;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm - 2 }}>
      {Array.from({ length: total }, (_, i) => (
        <NeoBox
          key={i}
          radius={shape === 'pill' ? height : 6}
          offset={borders.smallShadowOffset}
          backgroundColor={i === active ? colors.ink : colors.surface}
          style={{ width, height, borderWidth: borders.thin }}
        />
      ))}
    </View>
  );
}

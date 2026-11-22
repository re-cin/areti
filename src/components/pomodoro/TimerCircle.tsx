import { useWindowDimensions, View } from 'react-native';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';

type Props = {
  /** Already formatted, e.g. "23:49". */
  time: string;
  /** Phase tag under the time ("FOCUS", "BREAK"). Hidden when idle. */
  phase?: string;
};

/** Big terracotta clock face with a dashed inner ring. */
export function TimerCircle({ time, phase }: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.72, 290);
  const inset = size * 0.05;

  return (
    <NeoBox
      radius={size / 2}
      offset={borders.shadowOffset + 2}
      backgroundColor={colors.terracotta}
      style={{ width: size, height: size, borderWidth: borders.width + 0.5, alignItems: 'center', justifyContent: 'center' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          borderRadius: size / 2,
          borderWidth: borders.thin,
          borderStyle: 'dashed',
          borderColor: colors.muted,
        }}
      />
      <Text variant="display" accessibilityRole="timer">
        {time}
      </Text>
      {phase && (
        <View
          style={{
            backgroundColor: colors.ink,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 2,
            marginTop: -spacing.xs,
          }}>
          <Text variant="label" color={colors.white}>
            {phase}
          </Text>
        </View>
      )}
    </NeoBox>
  );
}

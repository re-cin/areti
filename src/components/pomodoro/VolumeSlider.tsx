import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';

type Props = { label: string; value: number };

/**
 * Label + percentage + slider track. Visual only: dragging is not implemented yet
 * (swap for a gesture-handler slider when wiring up the logic).
 */
export function VolumeSlider({ label, value }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const knob = 22;
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text variant="body" style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="smallStrong" style={{ fontSize: 12 }}>
          {pct}%
        </Text>
      </View>
      <View style={{ height: knob, justifyContent: 'center' }} accessibilityRole="adjustable" accessibilityValue={{ now: pct, min: 0, max: 100 }}>
        <View
          style={{
            height: 8,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: colors.ink,
            backgroundColor: colors.white,
            overflow: 'hidden',
          }}>
          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.muted }} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${pct}%`,
            marginLeft: -knob / 2,
            width: knob,
            height: knob,
            borderRadius: knob / 2,
            backgroundColor: colors.ink,
            borderWidth: borders.thin,
            borderColor: colors.ink,
          }}
        />
      </View>
    </View>
  );
}

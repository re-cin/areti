import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { borders, colors, radii } from '@/theme';

type Props = {
  /** 0..1 */
  progress: number;
  color: string;
  height?: number;
  /** Two colors for a left-to-right gradient fill (overrides `color`). */
  gradient?: readonly [string, string];
  /** Outline thickness. Defaults to the thin border. */
  borderWidth?: number;
  /** Gap between the outline and the fill (the Reti bars use 4). */
  inset?: number;
};

/** Outlined horizontal bar; `progress` is 0..1. */
export function ProgressBar({ progress, color, height = 14, gradient, borderWidth = borders.thin, inset = 0 }: Props) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  const fill = { width: `${pct}%` as const, height: '100%' as const, borderRadius: radii.pill };
  return (
    <View
      style={{
        height,
        borderRadius: radii.pill,
        borderWidth,
        borderColor: colors.ink,
        backgroundColor: colors.white,
        overflow: 'hidden',
        padding: inset,
      }}>
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={fill} />
      ) : (
        <View style={[fill, { backgroundColor: color }]} />
      )}
    </View>
  );
}

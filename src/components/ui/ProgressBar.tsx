import { View } from 'react-native';
import { borders, colors, radii } from '@/theme';

/** Outlined horizontal bar; `progress` is 0..1. */
export function ProgressBar({ progress, color, height = 14 }: { progress: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View
      style={{
        height,
        borderRadius: radii.pill,
        borderWidth: borders.thin,
        borderColor: colors.ink,
        backgroundColor: colors.white,
        overflow: 'hidden',
      }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: radii.pill }} />
    </View>
  );
}

import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/** Static Reti. The animated version (float, blink, hem flutter) comes with the Reti tab. */
export function Ghost({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
      <Defs>
        <LinearGradient id="ghostFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.7" stopColor={colors.ink} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.15} />
        </LinearGradient>
      </Defs>
      <Path
        d="M50 4C24 4 8 24 8 52v52q7-8 14 0t14 0 14 0 14 0 14 0 14 0V52C92 24 76 4 50 4Z"
        fill="url(#ghostFade)"
      />
      <Ellipse cx={39} cy={50} rx={3.2} ry={4.2} fill={colors.white} />
      <Ellipse cx={61} cy={50} rx={3.2} ry={4.2} fill={colors.white} />
      <Ellipse cx={50} cy={60} rx={2.4} ry={1.8} fill={colors.white} />
    </Svg>
  );
}

import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Static Reti for the Statistics bubble. The animated ghost (float, blink, hem flutter)
 * belongs to the Reti tab and is built last (see docs/decisions.md).
 */
export function GhostAvatar({ size = 88 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.05} viewBox="0 0 100 105">
      <Defs>
        <LinearGradient id="hem" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.72" stopColor={colors.ink} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.ink} stopOpacity="0.15" />
        </LinearGradient>
      </Defs>
      <Path
        d="M10 52C10 24 28 6 50 6s40 18 40 46v44c-5 5-11 5-16 0c-5 5-11 5-16 0c-5 5-11 5-16 0c-5 5-11 5-16 0c-5 5-11 5-16 0z"
        fill="url(#hem)"
      />
      <Ellipse cx={37} cy={50} rx={3.2} ry={5} fill={colors.white} />
      <Ellipse cx={64} cy={50} rx={3.2} ry={5} fill={colors.white} />
      <Ellipse cx={50} cy={63} rx={2} ry={1.4} fill={colors.white} />
    </Svg>
  );
}

import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { colors } from '@/theme';

// Figma draws this with a WebGPU "Pattern grid" shader, which React Native can't run.
// Same parameters, drawn as an SVG pattern: 95px boxes on a 99px grid, scaled by 0.38.
const ZOOM = 0.38;
const CELL = 99 * ZOOM;
const BOX = 95 * ZOOM;

/** Faint square grid behind the top of the Reti screen. */
export function GridBackdrop() {
  const gap = (CELL - BOX) / 2;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.pet.page }]}>
      <Svg width="100%" height="100%" style={{ opacity: 0.65 }}>
        <Defs>
          <Pattern id="petGrid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <Rect width={CELL} height={CELL} fill={colors.pet.gridLine} />
            <Rect x={gap} y={gap} width={BOX} height={BOX} fill={colors.pet.page} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#petGrid)" />
      </Svg>
    </View>
  );
}

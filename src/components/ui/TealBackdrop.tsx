import { useWindowDimensions, View } from 'react-native';
import { colors } from '@/theme';

/**
 * The big teal shape with a curved bottom that sits behind the top of the tab screens.
 * `height` is where the curve bottoms out; `curve` (0..1) is how round it is.
 */
export function TealBackdrop({ height, curve = 1 }: { height: number; curve?: number }) {
  const { width } = useWindowDimensions();
  const wide = width * 1.6;
  const radius = (wide / 2) * curve;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -height,
        left: (width - wide) / 2,
        width: wide,
        height: height * 2,
        backgroundColor: colors.teal,
        borderBottomLeftRadius: radius,
        borderBottomRightRadius: radius,
      }}
    />
  );
}

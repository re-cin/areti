import { Image } from 'expo-image';
import { View } from 'react-native';
import type { ExpressionId } from '@/features/pet';
import { colors } from '@/theme';
import { FACE_BOX, GhostFace } from './GhostFace';

const THUMB = require('../../../assets/images/pet/reti-thumb.png');

/** Where the thumbnail image sits on the 360 body canvas (it's frame 1 of reti-blank, cropped). */
const CROP = { x: 19, y: 11, w: 320, h: 337 } as const;

type Props = {
  expression: ExpressionId;
  /** Body color (the image is tinted). */
  bodyColor?: string;
  /** Hide the face (locked tiles). */
  blank?: boolean;
  width?: number;
};

/**
 * Still Reti for the Expressions grid: the real body shape (first frame of the calm body)
 * with the same face as the big ghost, without blinking or animation.
 */
export function MiniGhost({ expression, bodyColor = colors.ink, blank = false, width = 40 }: Props) {
  const scale = width / CROP.w;
  const height = CROP.h * scale;
  return (
    <View style={{ width, height }}>
      <Image source={THUMB} style={{ width, height }} contentFit="contain" tintColor={bodyColor} />
      {!blank && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: (FACE_BOX.x - CROP.x) * scale, top: (FACE_BOX.y - CROP.y) * scale }}>
          <GhostFace expression={expression} scale={scale} still />
        </View>
      )}
    </View>
  );
}

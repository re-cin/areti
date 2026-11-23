import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ExpressionId } from '@/features/pet';

/**
 * Face box on the 360 × 360 body canvas (reti-blank.webp). The head doesn't move in the
 * body animation, so the face sits at a fixed spot and needs no syncing.
 */
export const FACE_BOX = { x: 111, y: 110, w: 135, h: 62 } as const;

/** The eyes sit in the top part of the face box; blinking squashes this band around its middle. */
const EYE_BAND = 44; // eye line at y = 22

/**
 * Faces drawn by the artist (white, transparent, FACE_BOX size, no blinking).
 * Empty for now: every face below is drawn in code. Add a PNG here to override one.
 */
const FACE_IMAGES: Partial<Record<ExpressionId, number>> = {};

const WHITE = '#FFFFFF';
const line = { stroke: WHITE, strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
const fill = { fill: WHITE } as const;

// Geometry from the Neutral art: eye centers x 15 / 119 (y 22), mouth center x 69 (y 52).
// ---- Eyes ----------------------------------------------------------------
/** Upright pills, no angle. */
const openEyes = (h = 37, cy = 22) => (
  <>
    <Rect x={4} y={cy - h / 2} width={22} height={h} rx={11} {...fill} />
    <Rect x={108} y={cy - h / 2} width={22} height={h} rx={11} {...fill} />
  </>
);
/** Determined: the lid slopes down toward the nose, like an angry look ("\\ /"). */
const focusedEyes = (
  <>
    <Path d="M4 19L26 28V33a11 11 0 0 1-22 0Z" {...fill} />
    <Path d="M130 19L108 28V33a11 11 0 0 0 22 0Z" {...fill} />
  </>
);
/** Droopy: the lid cuts the top of each eye, sloping down toward the outer corner. */
const droopyEyes = (
  <>
    <Path d="M4 28L26 20V33a11 11 0 0 1-22 0Z" {...fill} />
    <Path d="M130 28L108 20V33a11 11 0 0 0 22 0Z" {...fill} />
  </>
);
/** Happy squint ("^ ^"), used by the excited faces. */
const archEyes = (
  <>
    <Path d="M5 28q10-18 20 0" {...line} strokeWidth={8} />
    <Path d="M109 28q10-18 20 0" {...line} strokeWidth={8} />
  </>
);
/** Closed, sleeping ("u u"). */
const closedEyes = (
  <>
    <Path d="M5 18q10 14 20 0" {...line} strokeWidth={8} />
    <Path d="M109 18q10 14 20 0" {...line} strokeWidth={8} />
  </>
);
/** Wide, sparkling (memory flash). */
const ringEyes = (
  <>
    <Circle cx={15} cy={22} r={11} stroke={WHITE} strokeWidth={6} fill="none" />
    <Circle cx={15} cy={22} r={5} {...fill} />
    <Circle cx={119} cy={22} r={11} stroke={WHITE} strokeWidth={6} fill="none" />
    <Circle cx={119} cy={22} r={5} {...fill} />
  </>
);

// ---- Mouths --------------------------------------------------------------
/** Straight, thin (Neutral). */
const thinMouth = <Rect x={58} y={50.5} width={22} height={3.5} rx={1.75} {...fill} />;
/** Straight, a bit thicker (Tired). */
const flatMouth = <Rect x={58} y={50} width={22} height={5} rx={2.5} {...fill} />;
/** "^" (Focused). */
const caretMouth = <Path d="M61 56l8-7 8 7" {...line} strokeWidth={5} />;
const dotMouth = <Circle cx={69} cy={53} r={5} {...fill} />;
const smile = <Path d="M58 48q11 12 22 0" {...line} />;
const frown = <Path d="M58 56q11-11 22 0" {...line} />;
const openMouth = <Path d="M55 46h28q0 16-14 16t-14-16Z" {...fill} />;
const oMouth = <Path d="M62 53a7 8 0 1 0 14 0a7 8 0 1 0-14 0Z" {...fill} />;
const wavyMouth = <Path d="M54 53q4-6 8 0t8 0 8 0 8 0" {...line} strokeWidth={5} />;

// ---- Extras --------------------------------------------------------------
/** Teardrop sweat, pointed at the top. Each drop is drawn in its own small box. */
const DROP = { w: 22, h: 30 } as const;
const sweatDrop = <Path d="M11 1c0 0 10 12 10 19a10 10 0 0 1-20 0c0-7 10-19 10-19Z" {...fill} />;
type Drop = { x: number; y: number; size: number }; // face-box units; size 1 = 22 × 30
/** Tired family: one drop up by the right eye, a smaller one low on the left, and the
 *  smallest low on the right, below the level of the left one. */
const TIRED_SWEAT: Drop[] = [
  { x: 140, y: -30, size: 1 },
  { x: -40, y: 52, size: 0.8 },
  { x: 150, y: 74, size: 0.6 },
];

type Face = {
  eyes: React.ReactNode;
  mouth: React.ReactNode;
  sweat?: Drop[];
  blink?: boolean;
  /** The mouth goes closed -> open -> closed over the celebration (see CelebrationMouth). */
  cheer?: boolean;
};

// Placeholder faces in the style of the Neutral art. Add a PNG to FACE_IMAGES to replace one.
const FACES: Record<ExpressionId, Face> = {
  neutral: { eyes: openEyes(), mouth: thinMouth, blink: true },
  slightlyHappy: { eyes: openEyes(), mouth: smile, blink: true },
  overjoyed: { eyes: archEyes, mouth: openMouth },
  sad: { eyes: openEyes(28, 26), mouth: frown, blink: true },
  focused: { eyes: focusedEyes, mouth: caretMouth, blink: true },
  tired: { eyes: droopyEyes, mouth: flatMouth, sweat: TIRED_SWEAT, blink: true },
  sleeping: { eyes: closedEyes, mouth: dotMouth },
  nervous: { eyes: openEyes(), mouth: wavyMouth, blink: true },
  tiredFocus: { eyes: droopyEyes, mouth: dotMouth, sweat: TIRED_SWEAT, blink: true },
  tiredNervous: { eyes: droopyEyes, mouth: wavyMouth, sweat: TIRED_SWEAT, blink: true },
  memoryFlash: { eyes: ringEyes, mouth: oMouth },
  goalCelebration: { eyes: archEyes, mouth: null, cheer: true },
};

/** Closes the eyes for ~0.15 s every few seconds, with an occasional double blink. */
function useBlink(enabled: boolean) {
  const closed = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      closed.value = 0;
      return;
    }
    const blink = () => withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 90 }));
    closed.value = withRepeat(
      withSequence(
        withDelay(2600, blink()),
        withDelay(3400, blink()),
        withDelay(180, blink()), // double blink
        withDelay(2200, blink()),
      ),
      -1,
    );
  }, [enabled, closed]);
  return useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - 0.9 * closed.value }] }));
}

/**
 * Celebration mouth, timed to the 4 s celebration and the excited body's jump:
 * closed while it winds up, opens wide on the leap (~0.8 s), closes again near the end,
 * then the ghost returns to its normal face.
 */
const CHEER = { openAt: 750, openMs: 200, closeAt: 3300, closeMs: 350 } as const;
const MOUTH_TOP = 46;
const MOUTH_H = 16;

function CelebrationMouth({ scale }: { scale: number }) {
  const open = useSharedValue(0);
  useEffect(() => {
    open.value = withSequence(
      withDelay(CHEER.openAt, withTiming(1, { duration: CHEER.openMs })),
      withDelay(CHEER.closeAt - CHEER.openAt - CHEER.openMs, withTiming(0, { duration: CHEER.closeMs })),
    );
  }, [open]);
  // Closed = a thin sliver of the open mouth (reads as a line); open = the full "D".
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.14 + 0.86 * open.value }] }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: MOUTH_TOP * scale, width: FACE_BOX.w * scale, height: MOUTH_H * scale, transformOrigin: 'top' },
        style,
      ]}>
      <Svg width={FACE_BOX.w * scale} height={MOUTH_H * scale} viewBox={`0 ${MOUTH_TOP} ${FACE_BOX.w} ${MOUTH_H}`}>
        {openMouth}
      </Svg>
    </Animated.View>
  );
}

/** The ghost's face for an expression, `scale` × the canvas size. Position it with FACE_BOX. */
export function GhostFace({ expression, scale }: { expression: ExpressionId; scale: number }) {
  const w = FACE_BOX.w * scale;
  const h = FACE_BOX.h * scale;
  const face = FACES[expression];
  const blinkStyle = useBlink(Boolean(face.blink) && !FACE_IMAGES[expression]);

  const image = FACE_IMAGES[expression];
  if (image) return <Image source={image} style={{ width: w, height: h }} contentFit="fill" />;

  const viewBox = `0 0 ${FACE_BOX.w} ${FACE_BOX.h}`;
  return (
    <View style={{ width: w, height: h }}>
      {/* Mouth (doesn't blink) */}
      {face.cheer ? (
        <CelebrationMouth scale={scale} />
      ) : (
        <Svg width={w} height={h} viewBox={viewBox} style={{ position: 'absolute' }}>
          {face.mouth}
        </Svg>
      )}
      {face.sweat?.map((d, i) => (
        <Svg
          key={i}
          width={DROP.w * d.size * scale}
          height={DROP.h * d.size * scale}
          viewBox={`0 0 ${DROP.w} ${DROP.h}`}
          style={{ position: 'absolute', left: d.x * scale, top: d.y * scale }}>
          {sweatDrop}
        </Svg>
      ))}
      {/* Eyes, squashed around the eye line when blinking */}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: EYE_BAND * scale }, blinkStyle]}>
        <Svg width={w} height={EYE_BAND * scale} viewBox={`0 0 ${FACE_BOX.w} ${EYE_BAND}`}>
          {face.eyes}
        </Svg>
      </Animated.View>
    </View>
  );
}


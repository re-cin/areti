import { Image } from 'expo-image';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { getExpression, type ExpressionId, type Overlay } from '@/features/pet';
import { colors } from '@/theme';
import { BODIES, BODY_FOR, CANVAS, PLAYS_INTRO, type MovingHeadBody } from './bodies';
import { FACE_BOX, GhostFace } from './GhostFace';

type Props = {
  expression: ExpressionId;
  overlay?: Overlay;
  onPress?: () => void;
  /** Width of the old placeholder; the square body is sized to match its height. */
  width?: number;
  /** An expression added on the admin site: a looping WebP of the whole pet, shown instead of body + face. */
  customUrl?: string;
};

/**
 * The big ghost: the expression's body (see bodies.ts) with its face on top, plus the
 * code float and confetti. Still-head bodies play by themselves with the face fixed;
 * the moving-head body is played frame by frame so the face follows the head.
 */
export function PetGhost({ expression, overlay, onPress, width = 170, customUrl }: Props) {
  const size = (width * 40) / 32; // square slot, same height as the old placeholder
  const scale = size / CANVAS;
  const bodyId = BODY_FOR[expression];
  const body = BODIES[bodyId];
  const confetti = overlay === 'confetti' || expression === 'goalCelebration';

  // Code float (up and down). Its speed follows the body; 0 turns it off.
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = 0;
    if (body.float > 0) {
      float.value = withRepeat(
        withTiming(1, { duration: body.float * 1000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
  }, [float, body.float]);
  // Small "pop" when tapped: a quick 5% grow that springs back.
  const pop = useSharedValue(1);
  const handlePress = () => {
    pop.value = withSequence(
      withTiming(1.05, { duration: 90 }),
      withSpring(1, { damping: 9, stiffness: 260, mass: 0.6 }),
    );
    onPress?.();
  };

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * float.value }, { scale: pop.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${getExpression(expression).label} ghost`}
      accessibilityHint="Tap to talk">
      <Animated.View style={[{ width: size, height: size }, floatStyle]}>
        {customUrl ? (
          <Image source={{ uri: customUrl }} style={StyleSheet.absoluteFill} contentFit="contain" autoplay cachePolicy="disk" />
        ) : body.kind === 'webp' ? (
          <>
            <Image source={body.source} style={StyleSheet.absoluteFill} contentFit="contain" autoplay />
            <View pointerEvents="none" style={{ position: 'absolute', left: FACE_BOX.x * scale, top: FACE_BOX.y * scale }}>
              <GhostFace expression={expression} scale={scale} />
            </View>
          </>
        ) : (
          // Remount when the expression changes so a celebration always starts with its intro.
          <SpriteBody key={`${bodyId}:${expression}`} body={body} intro={Boolean(PLAYS_INTRO[expression])} scale={scale}>
            <GhostFace expression={expression} scale={scale} />
          </SpriteBody>
        )}
      </Animated.View>
      {confetti && <Confetti size={size} />}
    </Pressable>
  );
}

/**
 * Plays a sprite-sheet body from one clock and moves the face (children) with the head.
 * With `intro`, frames [0, introEnd) play once first; then [loopStart, loopEnd) loops.
 */
function SpriteBody({
  body,
  intro,
  scale,
  children,
}: {
  body: MovingHeadBody;
  intro: boolean;
  scale: number;
  children: React.ReactNode;
}) {
  const { cellW, cellH, cols, frameMs, introEnd, loopStart, loopEnd, cropX, cropY } = body;
  const rows = Math.ceil(body.track.length / cols);
  const clock = useSharedValue(intro ? 0 : loopStart);

  useEffect(() => {
    const loop = withRepeat(
      withSequence(
        withTiming(loopStart, { duration: 0 }),
        withTiming(loopEnd, { duration: (loopEnd - loopStart) * frameMs, easing: Easing.linear }),
      ),
      -1,
    );
    clock.value = intro
      ? withSequence(withTiming(introEnd, { duration: introEnd * frameMs, easing: Easing.linear }), loop)
      : loop;
  }, [clock, intro, introEnd, loopStart, loopEnd, frameMs]);

  const track = useMemo(() => body.track.map((t) => [...t]), [body.track]);
  const frame = useDerivedValue(() => Math.min(Math.floor(clock.value), loopEnd - 1));

  const sheetStyle = useAnimatedStyle(() => {
    const f = frame.value;
    return {
      transform: [
        { translateX: -(f % cols) * cellW * scale },
        { translateY: -Math.floor(f / cols) * cellH * scale },
      ],
    };
  });

  const faceStyle = useAnimatedStyle(() => {
    const [cx, cy, sx, sy] = track[frame.value];
    return {
      transform: [
        { translateX: (cx - FACE_BOX.w / 2) * scale },
        { translateY: (cy - FACE_BOX.h / 2) * scale },
        { scaleX: sx },
        { scaleY: sy },
      ],
    };
  });

  return (
    <>
      {/* One cell of the sheet, placed where the frame sits on the 360 canvas */}
      <View
        style={{
          position: 'absolute',
          left: cropX * scale,
          top: cropY * scale,
          width: cellW * scale,
          height: cellH * scale,
          overflow: 'hidden',
        }}>
        <Animated.View style={[{ width: cols * cellW * scale, height: rows * cellH * scale }, sheetStyle]}>
          <Image source={body.sheet} style={StyleSheet.absoluteFill} contentFit="fill" />
        </Animated.View>
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, faceStyle]}>
        {children}
      </Animated.View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Confetti: pieces burst up and out from above the ghost, tumble and fall, on repeat.
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [colors.pet.goal, colors.pet.momentum, colors.exam, colors.gold] as const;
const PIECES = Array.from({ length: 14 }, (_, i) => {
  // Fixed pseudo-random spread so every celebration looks the same (no Math.random in render).
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  // Alternate sides and keep away from straight up, so pieces arc around the ghost, not onto its face.
  const side = i % 2 === 0 ? -1 : 1;
  const angle = (side < 0 ? -165 + 50 * r(1) : -65 + 50 * r(1)) * (Math.PI / 180);
  return {
    vx: Math.cos(angle) * (0.55 + 0.35 * r(2)),
    vy: Math.sin(angle) * (0.75 + 0.35 * r(3)),
    spin: (r(4) - 0.5) * 900,
    delay: Math.round(r(5) * 500),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    long: r(6) > 0.5,
  };
});
const CONFETTI_MS = 1400;

function Confetti({ size }: { size: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}>
      {PIECES.map((p, i) => (
        <ConfettiPiece key={i} piece={p} size={size} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, size }: { piece: (typeof PIECES)[number]; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      piece.delay,
      withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: CONFETTI_MS, easing: Easing.linear })), -1),
    );
  }, [t, piece.delay]);
  return <ConfettiShape t={t} piece={piece} size={size} />;
}

function ConfettiShape({ t, piece, size }: { t: SharedValue<number>; piece: (typeof PIECES)[number]; size: number }) {
  const style = useAnimatedStyle(() => {
    const p = t.value;
    const gravity = 2.2;
    return {
      opacity: p === 0 ? 0 : 1 - p * p * p,
      transform: [
        { translateX: piece.vx * size * p },
        { translateY: (piece.vy * p + 0.5 * gravity * p * p) * size },
        { rotate: `${piece.spin * p}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: size / 2 - 5,
          top: -size * 0.02, // just above the head
          width: piece.long ? 12 : 8,
          height: piece.long ? 5 : 8,
          borderRadius: piece.long ? 2 : 4,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

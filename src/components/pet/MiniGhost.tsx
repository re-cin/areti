import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { ExpressionId } from '@/features/pet';
import { colors } from '@/theme';

// Dome with a flat bottom and three rounded notches in the hem, as one shape so it
// sits on any background (grid, tiles) without cut-out colors.
const BODY =
  'M0 16a16 16 0 0 1 32 0v24h-2v-1a3 3 0 0 0-6 0v1h-5v-1a3 3 0 0 0-6 0v1h-5v-1a3 3 0 0 0-6 0v1H0Z';

type Props = {
  expression: ExpressionId;
  /** Color of the eyes and mouth. */
  faceColor: string;
  bodyColor?: string;
  /** Hide the face (locked tiles). */
  blank?: boolean;
  width?: number;
  /** Fade the bottom of the body to gray, like the Figma mascot. */
  fade?: boolean;
};

/**
 * The ghost drawn in the Expressions grid style (32 × 40 in Figma). Also used, scaled up,
 * as the placeholder for the big ghost until the real art exists.
 * Faces follow the Figma tiles where they exist; the rest are drafts in the same style.
 */
export function MiniGhost({ expression, faceColor, bodyColor = colors.ink, blank = false, width = 32, fade = false }: Props) {
  const f = { fill: faceColor } as const;
  const s = { stroke: faceColor, strokeWidth: 1.6, strokeLinecap: 'round', fill: 'none' } as const;

  const dotEyes = (
    <>
      <Circle cx={9} cy={17} r={3} {...f} />
      <Circle cx={23} cy={17} r={3} {...f} />
    </>
  );
  const arcEyes = (
    <>
      <Path d="M6 18q3-4 6 0" {...s} />
      <Path d="M20 18q3-4 6 0" {...s} />
    </>
  );
  const sleepyEyes = (
    <>
      <Path d="M6 16q3 3 6 0" {...s} />
      <Path d="M20 16q3 3 6 0" {...s} />
    </>
  );
  const tiredEyes = (
    <>
      <Path d="M6 17.5l6-1.5" {...s} />
      <Path d="M26 17.5l-6-1.5" {...s} />
      <Circle cx={9} cy={19} r={1.5} {...f} />
      <Circle cx={23} cy={19} r={1.5} {...f} />
    </>
  );
  const ringEyes = (
    <>
      <Circle cx={9} cy={16} r={3.5} {...s} strokeWidth={1} />
      <Circle cx={9} cy={16} r={2} {...f} />
      <Circle cx={23} cy={16} r={3.5} {...s} strokeWidth={1} />
      <Circle cx={23} cy={16} r={2} {...f} />
    </>
  );
  const lineMouth = <Rect x={11} y={23} width={10} height={2} rx={1} {...f} />;
  const dotMouth = <Circle cx={16} cy={25} r={2} {...f} />;
  const oMouth = <Circle cx={16} cy={25} r={3} {...f} />;
  const smile = <Path d="M12 23q4 4 8 0" {...s} />;
  const frown = <Path d="M12 26q4-4 8 0" {...s} />;
  const wavy = <Path d="M11 25q1.25-2 2.5 0t2.5 0 2.5 0 2.5 0" {...s} strokeWidth={1.3} />;

  // Each face is eyes + mouth in one fragment (no arrays, so React needs no keys).
  const face = (eyes: React.ReactNode, mouth: React.ReactNode) => (
    <>
      {eyes}
      {mouth}
    </>
  );
  const faces: Record<ExpressionId, React.ReactNode> = {
    neutral: face(dotEyes, lineMouth),
    slightlyHappy: face(arcEyes, smile),
    sad: face(dotEyes, frown),
    focused: face(dotEyes, dotMouth),
    overjoyed: face(ringEyes, oMouth),
    tired: face(tiredEyes, lineMouth),
    sleeping: face(sleepyEyes, dotMouth),
    nervous: face(dotEyes, wavy),
    tiredFocus: face(tiredEyes, dotMouth),
    tiredNervous: face(tiredEyes, wavy),
    memoryFlash: face(ringEyes, lineMouth),
    goalCelebration: face(arcEyes, oMouth),
  };


  return (
    <Svg width={width} height={(width * 40) / 32} viewBox="0 0 32 40">
      {fade && (
        <Defs>
          <LinearGradient id="ghostBodyFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.68" stopColor={bodyColor} />
            <Stop offset="1" stopColor={bodyColor} stopOpacity={0.72} />
          </LinearGradient>
        </Defs>
      )}
      <Path d={BODY} fill={fade ? 'url(#ghostBodyFade)' : bodyColor} />
      {!blank && <G>{faces[expression]}</G>}
    </Svg>
  );
}

import type { ExpressionId } from '@/features/pet';

/** Every body is drawn on a 360 × 360 canvas; faces are placed in canvas units. */
export const CANVAS = 360;

/**
 * A body whose head stays still: an animated WebP (transparent, looping) plays by itself
 * and the face sits at the fixed FACE_BOX.
 */
export type StillHeadBody = {
  kind: 'webp';
  source: number;
  /** Seconds for one up-and-down of the code float (0 = no float). */
  float: number;
};

/**
 * A body whose head moves: a sprite sheet the app plays frame by frame, so the face can
 * follow the head. `track[i]` = face center x, y (canvas units) and scale x, y for frame i.
 */
export type MovingHeadBody = {
  kind: 'sprite';
  sheet: number;
  /** Where the sheet's cells sit on the 360 canvas (frames were cropped to save space). */
  cropX: number;
  cropY: number;
  cellW: number;
  cellH: number;
  cols: number;
  frameMs: number;
  /** Frames [0, introEnd) play once at the start (when `intro` is requested). */
  introEnd: number;
  /** Frames [loopStart, loopEnd) loop forever. */
  loopStart: number;
  loopEnd: number;
  track: readonly (readonly [number, number, number, number])[];
  float: number;
};

export type Body = StillHeadBody | MovingHeadBody;

/** Calm wobble (reti-blank, 53 frames at 20 fps). */
const calm: StillHeadBody = { kind: 'webp', source: require('../../../assets/images/pet/reti-blank.webp'), float: 1.8 };

/** Slow, heavy sway for the low moods (reti-slow: frames 1-57 of the export, 15 fps, 3.8 s loop). */
const slow: StillHeadBody = { kind: 'webp', source: require('../../../assets/images/pet/reti-slow.webp'), float: 2.8 };

/**
 * Excited jump + bounce (reti-excited: frames 1-68 of the export, 15 fps).
 * Intro = squash and leap (frames 1-20), loop = bounce (frames 21-68, frame 69 matches 21).
 */
const excited: MovingHeadBody = {
  kind: 'sprite',
  sheet: require('../../../assets/images/pet/reti-excited-sheet.webp'),
  cropX: 12,
  cropY: 0,
  cellW: 327,
  cellH: 355,
  cols: 9,
  frameMs: 67,
  introEnd: 20,
  loopStart: 20,
  loopEnd: 68,
  // Generated from the frames: head position and squash per frame.
  track: [
  [179.0, 141.0, 0.997, 1.0],
  [177.5, 140.4, 1.0, 1.003],
  [176.0, 141.0, 1.003, 1.0],
  [170.5, 137.8, 1.006, 0.991],
  [176.5, 146.5, 1.006, 0.973],
  [176.5, 149.8, 1.006, 0.953],
  [174.5, 150.5, 1.006, 0.935],
  [176.0, 152.4, 1.003, 0.926],
  [178.0, 153.8, 1.003, 0.914],
  [177.0, 152.7, 1.003, 0.905],
  [177.5, 149.9, 0.987, 0.938],
  [178.0, 141.9, 0.952, 1.015],
  [177.5, 136.9, 0.929, 1.053],
  [177.0, 137.2, 0.932, 1.033],
  [176.5, 143.1, 0.948, 0.985],
  [176.0, 147.3, 0.958, 0.941],
  [176.0, 146.3, 0.958, 0.941],
  [176.0, 145.4, 0.958, 0.95],
  [176.0, 144.6, 0.958, 0.958],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 144.1, 0.952, 0.97],
  [176.0, 144.1, 0.952, 0.97],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 144.1, 0.952, 0.97],
  [176.0, 144.1, 0.952, 0.97],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.8, 0.952, 0.967],
  [176.0, 143.1, 0.952, 0.97],
  [176.0, 143.1, 0.952, 0.97],
  [176.0, 143.1, 0.952, 0.97],
  [176.0, 143.1, 0.952, 0.97],
  [176.0, 143.1, 0.952, 0.97],
  [176.0, 143.1, 0.952, 0.97],
  [176.0, 143.1, 0.952, 0.97],
  ],
  float: 0, // the body already bounces
};

export const BODIES = { calm, slow, excited } as const;
export type BodyId = keyof typeof BODIES;

/** Which body each expression uses. */
export const BODY_FOR: Record<ExpressionId, BodyId> = {
  neutral: 'calm',
  slightlyHappy: 'calm',
  focused: 'calm',
  nervous: 'calm',
  memoryFlash: 'calm',
  sad: 'slow',
  tired: 'slow',
  tiredFocus: 'slow',
  tiredNervous: 'slow',
  sleeping: 'slow',
  overjoyed: 'excited',
  goalCelebration: 'excited',
};

/** Expressions that play the moving body's intro once before looping. */
export const PLAYS_INTRO: Partial<Record<ExpressionId, boolean>> = { goalCelebration: true };

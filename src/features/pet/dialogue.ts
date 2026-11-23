import { unlockedExpressions } from './expressions';
import type { ExpressionId } from './types';

// Draft lines (spec 8: around 2-3 per expression, tbd). Edit freely.
export const DIALOGUE: Record<ExpressionId, readonly string[]> = {
  neutral: ['Meh.. I mean, It’s alright.', 'Just floating around.', 'Ready when you are.'],
  slightlyHappy: ['Ooh, we’re getting somewhere!', 'Nice pace today.', 'I like this rhythm.'],
  overjoyed: ['We’re on fire today!', 'Best study day ever!', 'Look at us go!'],
  sad: ['It’s been quiet lately…', 'Maybe one short session?', 'I miss studying with you.'],
  tired: ['Phew. That was a lot.', 'Let’s take it easy now.'],
  focused: ['Shh… locked in.', 'Eyes on the task.', 'Keep going, I’m with you.'],
  sleeping: ['Zzz…', 'Mmh… five more minutes…'],
  nervous: ['That exam is coming up…', 'Let’s review a little more?', 'We can do this. Probably.'],
  tiredFocus: ['Running on fumes, but still here.', 'One more block… then rest.'],
  tiredNervous: ['Exam soon, but you need rest too.', 'Sleep helps memory, you know.'],
  memoryFlash: ['Wait… I remember something!', 'A new feeling unlocked!'],
  goalCelebration: ['Goal reached! Woohoo!', 'You did it! Time to rest.'],
};

/** Separate pool for the goal-reached and tired states (spec 8). */
export const REST_LINES: readonly string[] = [
  'You hit your goal. Rest is part of studying too.',
  'Great work today. Go stretch!',
  'Drink some water, you earned it.',
];

/** Lines the ghost can say right now; only unlocked expressions contribute. */
export function linesFor(expression: ExpressionId, level: number, restMode = false): readonly string[] {
  if (restMode) return REST_LINES;
  const unlocked = new Set(unlockedExpressions(level).map((e) => e.id));
  return unlocked.has(expression) ? DIALOGUE[expression] : DIALOGUE.neutral;
}

/** Stable pick by index so the same tap count shows the same line. */
export function pickLine(lines: readonly string[], index: number): string {
  if (lines.length === 0) return '';
  return lines[((index % lines.length) + lines.length) % lines.length];
}

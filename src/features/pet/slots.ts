import { EXPRESSIONS, getExpression } from './expressions';
import type { ExpressionId } from './types';

// Slots: the situations the app can detect (spec 4 display priority). Every built-in expression owns one
// slot; expressions that admins add on the admin website are attached to a slot too, and the phone picks at
// random among the unlocked ones for the slot that comes up. Pure code: the admin website imports it.

export type SlotKind = 'status' | 'event';

export type SlotInfo = { id: ExpressionId; kind: SlotKind; label: string; when: string };

const WHEN: Record<ExpressionId, { kind: SlotKind; when: string }> = {
  neutral: { kind: 'status', when: 'Mood: low momentum and 40–124% of the goal, or decent momentum and under 40%' },
  slightlyHappy: { kind: 'status', when: 'Mood: decent momentum and 40–124% of the goal, or high momentum and under 90%' },
  overjoyed: { kind: 'status', when: 'Mood: high momentum and 90–124% of the goal' },
  sad: { kind: 'status', when: 'Mood: low momentum and under 40% of the goal' },
  tired: { kind: 'status', when: 'Studied 125% of the goal or more' },
  focused: { kind: 'status', when: 'A Pomodoro focus block is running' },
  sleeping: { kind: 'status', when: 'Sleep hours, no timer running' },
  nervous: { kind: 'status', when: 'An exam is 3 days away or less' },
  tiredFocus: { kind: 'status', when: 'Focus block running after 125% of the goal' },
  tiredNervous: { kind: 'status', when: 'Exam soon after studying 125% of the goal' },
  memoryFlash: { kind: 'event', when: 'Event: reached a new level (plays briefly)' },
  goalCelebration: { kind: 'event', when: 'Event: reached the daily goal, once a day (plays briefly)' },
};

export const SLOTS: readonly SlotInfo[] = EXPRESSIONS.map((e) => ({ id: e.id, label: e.label, ...WHEN[e.id] }));

export function slotInfo(id: ExpressionId): SlotInfo {
  return { id, label: getExpression(id).label, ...WHEN[id] };
}

export function isSlot(id: string): id is ExpressionId {
  return id in WHEN;
}

/** An expression added on the admin website (enabled ones only reach the phone). */
export type CustomExpression = { id: string; label: string; slot: ExpressionId; unlockLevel: number; url: string };

/** A dialogue line added on the admin website: `expression` is a built-in id or `custom:<id>`. */
export type CustomLine = { expression: string; text: string };

export const customKey = (id: string) => `custom:${id}`;

/**
 * What to show for `slot`: null = the built-in expression, otherwise an added one. Random among the
 * built-in (if unlocked) and every added expression for that slot whose unlock level is reached.
 */
export function pickVariant(
  slot: ExpressionId,
  level: number,
  customs: readonly CustomExpression[],
  builtInUnlocked: boolean,
  random: () => number = Math.random,
): CustomExpression | null {
  const added = customs.filter((c) => c.slot === slot && level >= c.unlockLevel);
  const choices: (CustomExpression | null)[] = [...(builtInUnlocked ? [null] : []), ...added];
  if (choices.length === 0) return null;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

/** Lines for an added expression: its own lines, or (if it has none) the lines of its slot. */
export function customLines(custom: CustomExpression, lines: readonly CustomLine[], slotLines: readonly string[]): readonly string[] {
  const own = lines.filter((l) => l.expression === customKey(custom.id)).map((l) => l.text);
  return own.length ? own : slotLines;
}

/** Extra lines added for a built-in expression. */
export function addedLinesFor(id: ExpressionId, lines: readonly CustomLine[]): string[] {
  return lines.filter((l) => l.expression === id).map((l) => l.text);
}

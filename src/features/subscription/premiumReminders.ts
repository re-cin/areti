/**
 * When to remind a Premium user that Premium is ending: once when 24 hours are left and once
 * when 1 hour is left. Pure logic (no React, no storage) so it is easy to test.
 */

export type PremiumReminder = '24h' | '1h';

const HOUR = 60 * 60 * 1000;
export const REMINDER_AT: Record<PremiumReminder, number> = { '24h': 24 * HOUR, '1h': HOUR };

/**
 * The reminder to show now, or null. Shows the closest one only: opening the app 30 minutes
 * before the end shows "1 hour left", not both. Nothing once Premium has ended.
 */
export function dueReminder(endMs: number, nowMs: number, shown: ReadonlySet<PremiumReminder>): PremiumReminder | null {
  const left = endMs - nowMs;
  if (left <= 0) return null;
  if (left <= REMINDER_AT['1h']) return shown.has('1h') ? null : '1h';
  if (left <= REMINDER_AT['24h']) return shown.has('24h') ? null : '24h';
  return null;
}

/** Milliseconds until the next reminder moment (or the end), so a timer can wake up then. */
export function msUntilNextCheck(endMs: number, nowMs: number): number | null {
  const marks = [endMs - REMINDER_AT['24h'], endMs - REMINDER_AT['1h'], endMs].filter((t) => t > nowMs);
  if (marks.length === 0) return null;
  return Math.min(...marks) - nowMs;
}

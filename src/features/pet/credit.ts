// Spec section 1 (credited focus minutes) and 3.1 (momentum).

/** A block needs at least this many focused minutes to earn any credit. */
export const MIN_CREDITED_MINUTES = 15;
/** Proposed guard: daily credit ceiling (~10 hours). */
export const DAILY_CREDIT_CEILING = 600;

/**
 * Credited minutes for one focus block, applied when it ends (completed or cancelled).
 * Whole minutes only, rounded down; under 15 gives 0.
 */
export function creditedMinutes(focusedMinutes: number): number {
  const whole = Math.floor(Math.max(0, focusedMinutes));
  return whole >= MIN_CREDITED_MINUTES ? whole : 0;
}

/** Caps a new block's credit so today's total never passes the ceiling. */
export function applyDailyCeiling(creditedToday: number, blockCredit: number): number {
  return Math.max(0, Math.min(blockCredit, DAILY_CREDIT_CEILING - creditedToday));
}

export const MOMENTUM_START = 50;
export const MOMENTUM_GAIN_PER_MINUTE = 0.4;
export const MOMENTUM_DECAY_PER_IDLE_MINUTE = 0.2;

const clampMomentum = (m: number) => Math.max(0, Math.min(100, m));

/** +0.4 per credited minute (a 50-minute block gives +20). */
export function gainMomentum(momentum: number, creditedMins: number): number {
  return clampMomentum(momentum + creditedMins * MOMENTUM_GAIN_PER_MINUTE);
}

/**
 * -0.2 per idle minute inside Study Slots. The caller passes only minutes that count:
 * not during a session (breaks included), not in the sleep period, not outside slots.
 */
export function decayMomentum(momentum: number, idleMinutesInSlots: number): number {
  return clampMomentum(momentum - idleMinutesInSlots * MOMENTUM_DECAY_PER_IDLE_MINUTE);
}

// The timer never counts seconds with setInterval (the phone pauses it in the background).
// It stores the moment the session ends and always derives the remaining time from the clock.
export const endsAtFrom = (now: number, durationMs: number) => now + durationMs;
export const remainingMs = (endsAt: number, now: number) => Math.max(0, endsAt - now);
export const isFinished = (endsAt: number, now: number) => now >= endsAt;

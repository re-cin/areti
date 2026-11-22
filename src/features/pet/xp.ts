// XP rules for Reti. Pure functions, shared by the timer (awarding) and statistics (display).

/** 1 XP per 5 focus minutes, plus 5 XP for finishing a whole focus block. */
export function xpForFocus(durationSec: number, completed: boolean): number {
  return Math.floor(durationSec / 60 / 5) + (completed ? 5 : 0);
}

/** XP needed to go from `level` to the next level (Lv 4 needs 500). */
export function xpToNextLevel(level: number): number {
  return 100 * (level + 1);
}

/** Adds XP, levelling up as many times as needed. `xp` is progress inside the current level. */
export function addXp(level: number, xp: number, gained: number): { level: number; xp: number } {
  let l = level;
  let x = xp + Math.max(0, gained);
  while (x >= xpToNextLevel(l)) {
    x -= xpToNextLevel(l);
    l += 1;
  }
  return { level: l, xp: x };
}

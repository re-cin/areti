import { getSetting, SETTING_KEYS, setSetting } from '@/features/settings/settingsRepo';
import { bumpData } from '@/stores/dataVersion';

export type PomodoroSettings = {
  /** Focus blocks before a long break (and the length of a free, unplanned run). */
  focusCount: number;
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  backgroundSound: string;
  backgroundVolume: number; // 0..100
  notificationSound: string;
  notificationVolume: number; // 0..100
};

export const DEFAULT_POMODORO: PomodoroSettings = {
  focusCount: 4,
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  backgroundSound: 'Rain & Cozy Cafe',
  backgroundVolume: 45,
  notificationSound: 'Singing Tibetan Bowl',
  notificationVolume: 80,
};

/** Stepper limits: [min, max, step]. */
export const POMODORO_LIMITS = {
  focusCount: [1, 8, 1],
  focusMin: [15, 120, 5], // 15 = the least that earns credit
  breakMin: [1, 30, 1],
  longBreakMin: [5, 60, 5],
} as const;

// Sound names come from the file registry (src/features/audio/sounds.ts).
export { BACKGROUND_SOUNDS, NOTIFICATION_SOUNDS } from '@/features/audio/sounds';

export async function loadPomodoroSettings(): Promise<PomodoroSettings> {
  const saved = await getSetting<Partial<PomodoroSettings>>(SETTING_KEYS.pomodoro, {});
  const s = { ...DEFAULT_POMODORO, ...saved };
  return { ...s, focusMin: Math.max(POMODORO_LIMITS.focusMin[0], s.focusMin) };
}

export async function savePomodoroSettings(value: PomodoroSettings): Promise<void> {
  await setSetting(SETTING_KEYS.pomodoro, value);
  bumpData();
}

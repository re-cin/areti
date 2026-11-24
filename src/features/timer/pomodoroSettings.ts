import { getSetting, SETTING_KEYS, setSetting } from '@/features/settings/settingsRepo';
import { bumpData } from '@/stores/dataVersion';
import { currentSoundName } from '@/features/audio/sounds';

export type PomodoroSettings = {
  /** Focus blocks before a long break (and the length of a free, unplanned run). */
  /** Number of focus blocks in a session. */
  focusCount: number;
  /** Focus time of every block. */
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
  focusCount: [1, 15, 1],
  focusMin: [5, 120, 5], // 5 = shortest block allowed (session structure rules)
  breakMin: [1, 60, 1],
  longBreakMin: [5, 60, 5],
} as const;

// Sound names come from the file registry (src/features/audio/sounds.ts).
export { BACKGROUND_SOUNDS, NOTIFICATION_SOUNDS } from '@/features/audio/sounds';

export async function loadPomodoroSettings(): Promise<PomodoroSettings> {
  const saved = await getSetting<Partial<PomodoroSettings>>(SETTING_KEYS.pomodoro, {});
  const s = { ...DEFAULT_POMODORO, ...saved };
  const min = POMODORO_LIMITS.focusMin[0];
  // "White Noise" was renamed "Velvet Espresso".
  return { ...s, focusMin: Math.max(min, s.focusMin), backgroundSound: currentSoundName(s.backgroundSound) };
}

export async function savePomodoroSettings(value: PomodoroSettings): Promise<void> {
  await setSetting(SETTING_KEYS.pomodoro, value);
  bumpData();
}

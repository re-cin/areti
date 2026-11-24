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

/** The default timing: 4 blocks of 25 min, 5 min short breaks, a 15 min long break. */
export const DEFAULT_TIMING = {
  focusCount: DEFAULT_POMODORO.focusCount,
  focusMin: DEFAULT_POMODORO.focusMin,
  breakMin: DEFAULT_POMODORO.breakMin,
  longBreakMin: DEFAULT_POMODORO.longBreakMin,
} as const;

/**
 * Set once (per account, it syncs) after the saved timing was put back to the defaults.
 * Earlier test builds saved other timings (e.g. 120 min focus) that then stuck as everyone's "default".
 */
const TIMING_RESET_KEY = 'pomodoro.timingReset.v1';

export async function loadPomodoroSettings(): Promise<PomodoroSettings> {
  let saved = await getSetting<Partial<PomodoroSettings>>(SETTING_KEYS.pomodoro, {});
  if (!(await getSetting<boolean>(TIMING_RESET_KEY, false))) {
    // One time: the timing goes back to the defaults; sounds and volumes are kept.
    if (Object.keys(saved).length > 0) {
      saved = { ...saved, ...DEFAULT_TIMING };
      await setSetting(SETTING_KEYS.pomodoro, saved);
    }
    await setSetting(TIMING_RESET_KEY, true);
    bumpData();
  }
  const s = { ...DEFAULT_POMODORO, ...saved };
  const min = POMODORO_LIMITS.focusMin[0];
  // "White Noise" was renamed "Velvet Espresso".
  return { ...s, focusMin: Math.max(min, s.focusMin), backgroundSound: currentSoundName(s.backgroundSound) };
}

export async function savePomodoroSettings(value: PomodoroSettings): Promise<void> {
  await setSetting(SETTING_KEYS.pomodoro, value);
  bumpData();
}

import { getSetting, setSetting } from './settingsRepo';
import { bumpData } from '@/stores/dataVersion';

// User preferences from Settings > Preferences, shared by the Planner, Reti and the rest of the app.
// Pure helpers first (no database), so the Planner engine and the pet logic can use them in tests.

export const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type DayName = (typeof DAY_NAMES_FULL)[number];
export type TimeRange = { start: string; end: string }; // 'HH:MM', 24-hour
export type StudySlots = {
  /** Default: one time range for Mon - Fri and one for Sat - Sun, every day on. Custom: per day. */
  mode: 'Default' | 'Custom';
  schedule: Record<DayName, TimeRange>;
  /** Days that have study time (Custom only; Default uses every day). */
  enabledDays: DayName[];
};

export type AppPreferences = {
  backgroundWork: boolean;
  notifications: boolean;
  petPhysics: boolean;
  /** Sleep grace period: Reti's momentum does not drop between these times. */
  sleepStart: string;
  sleepEnd: string;
  chatter: string;
  dateFormat: string;
  firstDay: string;
  timeFormat: string;
  studySlots: StudySlots;
};

const all = (range: TimeRange) => Object.fromEntries(DAY_NAMES_FULL.map((d) => [d, { ...range }])) as Record<DayName, TimeRange>;

export const DEFAULT_STUDY_SLOTS: StudySlots = {
  mode: 'Default',
  schedule: all({ start: '06:00', end: '20:00' }),
  enabledDays: [...DAY_NAMES_FULL],
};

/** Starting point when the user switches to Custom and presses Reset. */
export const CUSTOM_RESET_SCHEDULE: Record<DayName, TimeRange> = all({ start: '18:00', end: '20:30' });

export const DEFAULT_PREFERENCES: AppPreferences = {
  backgroundWork: true,
  notifications: true,
  petPhysics: true,
  sleepStart: '23:00',
  sleepEnd: '07:00',
  chatter: 'Balanced',
  dateFormat: 'dd/mm/yy',
  firstDay: 'Monday',
  timeFormat: '12-Hour (AM/PM)',
  studySlots: DEFAULT_STUDY_SLOTS,
};

/** The one daily study goal (minutes), used by the Planner's schedule and Reti's goal bar. */
export const DAILY_GOAL_KEY = 'planner.dailyGoalMin';
export const DEFAULT_DAILY_GOAL_MIN = 120;
export const PREFERENCES_KEY = 'prefs.app';

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

/** Fills in anything missing from an older or partial saved copy. */
export function normalizePreferences(raw: Partial<AppPreferences> | null | undefined): AppPreferences {
  const slots = raw?.studySlots;
  return {
    ...DEFAULT_PREFERENCES,
    ...raw,
    studySlots: {
      mode: slots?.mode === 'Custom' ? 'Custom' : 'Default',
      schedule: { ...DEFAULT_STUDY_SLOTS.schedule, ...slots?.schedule },
      enabledDays: Array.isArray(slots?.enabledDays)
        ? slots.enabledDays.filter((d): d is DayName => (DAY_NAMES_FULL as readonly string[]).includes(d))
        : [...DAY_NAMES_FULL],
    },
  };
}

/**
 * Study time for one weekday (0 = Sunday ... 6 = Saturday, like Date.getDay()), in minutes from
 * midnight, or null when that day has no study time. An end before the start runs past midnight.
 */
export function studySlotForWeekday(slots: StudySlots, weekday: number): { start: number; end: number } | null {
  const name = DAY_NAMES_FULL[(weekday + 6) % 7];
  let range: TimeRange;
  if (slots.mode === 'Default') {
    range = weekday === 0 || weekday === 6 ? slots.schedule.Saturday : slots.schedule.Monday;
  } else {
    if (!slots.enabledDays.includes(name)) return null;
    range = slots.schedule[name];
  }
  const start = toMinutes(range.start);
  const end = toMinutes(range.end);
  return start === end ? null : { start, end };
}

/** All seven weekdays at once (index = Date.getDay()). */
export const weeklyStudySlots = (slots: StudySlots) =>
  Array.from({ length: 7 }, (_, weekday) => studySlotForWeekday(slots, weekday));

// ---------------------------------------------------------------- database

export async function loadPreferences(): Promise<AppPreferences> {
  return normalizePreferences(await getSetting<Partial<AppPreferences> | null>(PREFERENCES_KEY, null));
}

export async function savePreferences(value: AppPreferences): Promise<void> {
  await setSetting(PREFERENCES_KEY, value);
  bumpData();
}

export async function loadDailyGoalMin(): Promise<number> {
  const value = await getSetting<number | null>(DAILY_GOAL_KEY, null);
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_GOAL_MIN;
}

export async function saveDailyGoalMin(minutes: number): Promise<void> {
  await setSetting(DAILY_GOAL_KEY, Math.max(15, Math.round(minutes)));
  bumpData();
}

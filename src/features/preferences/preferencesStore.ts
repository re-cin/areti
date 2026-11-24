
import { create } from 'zustand';
import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PREFERENCES_KEY = 'user.preferences';

export type Day =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type StudySlot = {
  start: string;
  end: string;
};

export type StudySchedule = Record<Day, StudySlot>;

export type Preferences = {
  backgroundWork: boolean;
  notifications: boolean;
  sleepStart: string;
  sleepEnd: string;
  chatter: string;
  dailyGoal: number;
  dateFormat: string;
  firstDay: 'Monday' | 'Sunday';
  timeFormat: '12-Hour (AM/PM)' | '24-Hour';
  mode: 'Default' | 'Custom';
  schedule: StudySchedule;
  enabledDays: Day[];
};

export const DAYS: Day[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const DEFAULT_PREFERENCES: Preferences = {
  backgroundWork: true,
  notifications: true,
  sleepStart: '07:30',
  sleepEnd: '21:30',
  chatter: 'Balanced',
  dailyGoal: 3,
  dateFormat: 'dd/mm/yy',
  firstDay: 'Monday',
  timeFormat: '12-Hour (AM/PM)',
  mode: 'Default',
  schedule: Object.fromEntries(
    DAYS.map(day => [
      day,
      { start: '06:00', end: '20:00' },
    ]),
  ) as StudySchedule,
  enabledDays: [...DAYS],
};

type PreferencesStore = {
  preferences: Preferences;
  hydrated: boolean;
  loadPreferences: () => Promise<void>;
  updatePreferences: (patch: Partial<Preferences>) => void;
};

let loadPromise: Promise<void> | null = null;

export const usePreferences = create<PreferencesStore>((set, get) => ({
  preferences: DEFAULT_PREFERENCES,
  hydrated: false,

  loadPreferences: () => {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const row = db
          .select()
          .from(settings)
          .where(eq(settings.key, PREFERENCES_KEY))
          .get();

        const saved = row ? JSON.parse(row.value) as Partial<Preferences> : {};

        // Preserve changes made while loading.
        if (!get().hydrated) {
          set({
            preferences: {
              ...DEFAULT_PREFERENCES,
              ...saved,
              schedule: {
                ...DEFAULT_PREFERENCES.schedule,
                ...saved.schedule,
              },
            },
            hydrated: true,
          });
        }
      } catch (error) {
        console.warn('[preferences] Could not load preferences', error);
        set({ hydrated: true });
      }
    })().finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  },

  updatePreferences: patch => {
    const next = { ...get().preferences, ...patch };

    // Save before updating the UI so failed writes do not
    // silently appear successful.
    try {
      const now = Date.now();
      const value = JSON.stringify(next);

      db.insert(settings)
        .values({
          key: PREFERENCES_KEY,
          value,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: now },
        })
        .run();

      set({ preferences: next, hydrated: true });
    } catch (error) {
      console.warn('[preferences] Could not save preferences', error);
    }
  },
}));

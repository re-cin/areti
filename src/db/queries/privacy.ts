import { and, isNull, ne } from 'drizzle-orm';
import Constants from 'expo-constants';
import { db } from '../client';
import {
  focusSessions,
  ghostState,
  plannedSessions,
  profile,
  settings,
  studyPlans,
  subjects,
  tasks,
} from '../schema';

/**
 * Everything the user has made in the app, as pretty-printed JSON.
 * Account passwords and the sign-in session are left out on purpose.
 */
export async function exportAllData(): Promise<string> {
  const active = isNull; // only rows that haven't been deleted
  const [subjectRows, planRows, sessionRows, focusRows, ghostRows, taskRows, profileRows, settingRows] =
    await Promise.all([
      db.select().from(subjects).where(active(subjects.deletedAt)),
      db.select().from(studyPlans).where(active(studyPlans.deletedAt)),
      db.select().from(plannedSessions).where(active(plannedSessions.deletedAt)),
      db.select().from(focusSessions).where(active(focusSessions.deletedAt)),
      db.select().from(ghostState).where(active(ghostState.deletedAt)),
      db.select().from(tasks).where(active(tasks.deletedAt)),
      db.select().from(profile).where(active(profile.deletedAt)),
      db.select().from(settings).where(ne(settings.key, 'session')),
    ]);

  return JSON.stringify(
    {
      app: 'areti',
      appVersion: Constants.expoConfig?.version ?? null,
      exportedAt: new Date().toISOString(),
      studySchedules: { subjects: subjectRows, studyPlans: planRows, plannedSessions: sessionRows, tasks: taskRows },
      timerHistory: focusRows,
      pet: ghostRows,
      profile: profileRows,
      settings: settingRows.map((s) => ({ ...s, value: safeParse(s.value) })),
    },
    null,
    2,
  );
}

/**
 * Erases the study logs (Pomodoro / focus session history) and nothing else:
 * subjects, schedules, tasks, the ghost's XP and the account stay.
 * Uses a soft delete (deletedAt), like every other delete in the app, so it can sync later.
 * Returns how many sessions were cleared.
 */
export async function clearStudyHistory(): Promise<number> {
  const now = Date.now();
  const cleared = await db
    .update(focusSessions)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(isNull(focusSessions.deletedAt)))
    .returning({ id: focusSessions.id });
  return cleared.length;
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

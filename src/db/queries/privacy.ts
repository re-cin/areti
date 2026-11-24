import { isNull, like, ne } from 'drizzle-orm';
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
 * "Clear study history": erases every exam (study plan), task, scheduled Pomodoro session and logged
 * focus session, and the exam ticks in Daily Tasks. Statistics, the streak and Reti's level/XP are
 * worked out from the focus log, so they start again too. Subjects and settings stay.
 * Exams go too: otherwise automatic scheduling would rebuild their sessions and tasks right away.
 * Soft delete (deletedAt + a new updatedAt), like every other delete, so the next sync erases them
 * on the account and on every other phone as well.
 * Returns how many focus sessions were cleared.
 */
export async function clearStudyHistory(): Promise<number> {
  const now = Date.now();
  const cleared = db.transaction((tx) => {
    const logs = tx.update(focusSessions).set({ deletedAt: now, updatedAt: now })
      .where(isNull(focusSessions.deletedAt)).returning({ id: focusSessions.id }).all();
    tx.update(tasks).set({ deletedAt: now, updatedAt: now }).where(isNull(tasks.deletedAt)).run();
    tx.update(plannedSessions).set({ deletedAt: now, updatedAt: now }).where(isNull(plannedSessions.deletedAt)).run();
    tx.update(studyPlans).set({ deletedAt: now, updatedAt: now }).where(isNull(studyPlans.deletedAt)).run();
    tx.update(settings).set({ value: 'false', updatedAt: now }).where(like(settings.key, 'exam-done:%')).run();
    return logs.length;
  });
  return cleared;
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

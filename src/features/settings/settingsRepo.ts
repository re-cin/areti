import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { settings } from '@/db/schema';

/** Read a JSON setting. Returns `fallback` when missing or unreadable. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (rows.length === 0) return fallback;
  try {
    return JSON.parse(rows[0].value) as T;
  } catch {
    return fallback;
  }
}

/** Write (insert or replace) a JSON setting. */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  const now = Date.now();
  await db
    .insert(settings)
    .values({ key, value: json, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: now } });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

/** Keys used across the app, in one place. */
export const SETTING_KEYS = {
  pomodoro: 'pomodoro',
  profile: 'profile',
  timerState: 'timer.state',
} as const;

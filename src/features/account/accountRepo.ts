import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { focusSessions, ghostState, plannedSessions, profile as profileTable, settings, studyPlans, subjects, tasks } from '@/db/schema';
import { refreshSessionReminders } from '@/features/timer/reminders';
import { saveDisplayName } from '@/db/queries/profile';
import { AuthError } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { getSetting, SETTING_KEYS, setSetting } from '@/features/settings/settingsRepo';
import { bumpData } from '@/stores/dataVersion';

export type Profile = {
  /** Supabase user id ('' when signed out). */
  id: string;
  name: string;
  email: string;
  /** Profile picture link (Supabase Storage), or null for the default icon. */
  pictureUri: string | null;
  plan: 'free' | 'pro';
  joinedAt: number;
};

/** Thrown by updateProfile when another account already uses the new email. */
export class EmailTakenError extends Error {
  constructor() {
    super('email-taken');
    this.name = 'EmailTakenError';
  }
}

/** "ryan.butalid@gmail.com" -> "Ryan Butalid". */
export function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type SavedPlan = { plan?: Profile['plan'] };

/**
 * The signed-in user's profile. Email and join date come from their Supabase account;
 * name and picture from the synced `profile` row (id = user id, see src/db/queries/profile.ts).
 */
export async function getProfile(): Promise<Profile> {
  const saved = await getSetting<SavedPlan>(SETTING_KEYS.profile, {});
  const plan = saved.plan ?? 'free';
  const user = supabaseConfigured ? (await supabase.auth.getSession()).data.session?.user : undefined;
  if (!user) return { id: '', name: '', email: '', pictureUri: null, plan, joinedAt: Date.now() };

  const [row] = await db.select().from(profileTable).where(eq(profileTable.id, user.id));
  const email = user.email ?? '';
  return {
    id: user.id,
    // Sign up only asks for an email, so until a name is set we use the email's first part.
    name: row?.displayName?.trim() || nameFromEmail(email),
    email,
    pictureUri: row?.pictureUri ?? null,
    plan,
    joinedAt: new Date(user.created_at).getTime(),
  };
}

/**
 * Saves profile changes. The name syncs to other phones. A new email is sent to Supabase,
 * which emails a confirmation link; it only changes once confirmed (returns 'confirm-email').
 * Throws EmailTakenError if another account already has it.
 */
export async function updateProfile(patch: Partial<Pick<Profile, 'name' | 'email' | 'plan'>>): Promise<'saved' | 'confirm-email'> {
  let result: 'saved' | 'confirm-email' = 'saved';
  const current = await getProfile();
  if (patch.name !== undefined && current.id) await saveDisplayName(current.id, patch.name);
  if (patch.plan !== undefined) await setSetting(SETTING_KEYS.profile, { plan: patch.plan });
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (email && email !== current.email.toLowerCase()) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) {
        if (error.code === 'email_exists' || error.code === 'user_already_exists') throw new EmailTakenError();
        if (!error.status || /network|fetch/i.test(error.message)) throw new AuthError('offline', error.message);
        throw error;
      }
      result = 'confirm-email';
    }
  }
  bumpData();
  return result;
}

/** Everything the user has created, as pretty JSON. */
export async function exportAllData(): Promise<string> {
  const data = {
    app: 'areti',
    exportedAt: new Date().toISOString(),
    subjects: await db.select().from(subjects).where(isNull(subjects.deletedAt)),
    studyPlans: await db.select().from(studyPlans).where(isNull(studyPlans.deletedAt)),
    plannedSessions: await db.select().from(plannedSessions).where(isNull(plannedSessions.deletedAt)),
    focusSessions: await db.select().from(focusSessions).where(isNull(focusSessions.deletedAt)),
    ghost: await db.select().from(ghostState).where(isNull(ghostState.deletedAt)),
    settings: await db.select().from(settings),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * "Clear study history": soft-deletes (so it syncs to every phone) all focus logs (statistics and streak),
 * scheduled Pomodoro sessions and Planner tasks, and resets Reti to level 1 with 0 XP (XP comes from that
 * focus time). Subjects and settings stay.
 */
export async function clearStudyHistory(): Promise<void> {
  const now = Date.now();
  const gone = { deletedAt: now, updatedAt: now };
  await db.update(focusSessions).set(gone).where(isNull(focusSessions.deletedAt));
  await db.update(plannedSessions).set(gone).where(isNull(plannedSessions.deletedAt));
  await db.update(tasks).set(gone).where(isNull(tasks.deletedAt));
  await db.update(ghostState).set({ level: 1, xp: 0, updatedAt: now }).where(isNull(ghostState.deletedAt));
  bumpData();
  void refreshSessionReminders(); // no more reminders for the cleared tasks and sessions
}

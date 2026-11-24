import { getEntitlements } from '@/features/planner/examsRepo';
import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { focusSessions, ghostState, plannedSessions, profile as profileTable, settings, studyPlans, subjects } from '@/db/schema';
import { saveDisplayName } from '@/db/queries/profile';
import { AuthError } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
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

/** The display name given at sign-up (also kept in the account's metadata), if any. */
function signUpName(user: { user_metadata?: Record<string, unknown> }): string | null {
  const name = user.user_metadata?.display_name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

/**
 * The signed-in user's profile. Email and join date come from their Supabase account;
 * name and picture from the synced `profile` row (id = user id, see src/db/queries/profile.ts).
 */
export async function getProfile(): Promise<Profile> {
  // The plan comes from the server-owned subscription cache, never from a value the student can edit.
  const plan: Profile['plan'] = (await getEntitlements()).tier === 'premium' ? 'pro' : 'free';
  const user = supabaseConfigured ? (await supabase.auth.getSession()).data.session?.user : undefined;
  if (!user) return { id: '', name: '', email: '', pictureUri: null, plan, joinedAt: Date.now() };

  const [row] = await db.select().from(profileTable).where(eq(profileTable.id, user.id));
  const email = user.email ?? '';
  return {
    id: user.id,
    // Name: the synced profile row; right after sign-up (before the first sync brings that row)
    // the display name given at sign-up; older accounts without one: the email's first part.
    name: row?.displayName?.trim() || signUpName(user) || nameFromEmail(email),
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
export async function updateProfile(patch: Partial<Pick<Profile, 'name' | 'email'>>): Promise<'saved' | 'confirm-email'> {
  let result: 'saved' | 'confirm-email' = 'saved';
  const current = await getProfile();
  if (patch.name !== undefined && current.id) await saveDisplayName(current.id, patch.name);
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

/** "Clear study history": soft-deletes focus logs only. Subjects, plans, XP and settings stay. */
export async function clearStudyHistory(): Promise<void> {
  const now = Date.now();
  await db.update(focusSessions).set({ deletedAt: now, updatedAt: now }).where(isNull(focusSessions.deletedAt));
  bumpData();
}

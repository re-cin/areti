import type { Session } from '@supabase/supabase-js';
import { clearLocalData, finishAndClearLocalData } from '@/sync/sync';
import { supabase, supabaseConfigured } from './supabase';

/**
 * Accounts are Supabase Auth (email + password), so the same account works on any phone.
 * Study data stays in SQLite on the phone and syncs to Supabase (src/sync/sync.ts).
 */

/** Shortest password allowed when creating one. */
export const MIN_PASSWORD_LENGTH = 8;

export type AuthErrorCode =
  | 'email-taken'
  | 'wrong-credentials'
  | 'confirm-email' // account exists but the email isn't confirmed yet
  | 'weak-password'
  | 'offline'
  | 'not-configured'
  | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

/** Creates an account. Throws AuthError('confirm-email') if Supabase wants the email confirmed first. */
export async function signUp(email: string, password: string) {
  ensureConfigured();
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw toAuthError(error);
  // With email confirmation on, Supabase hides "already registered" by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0) throw new AuthError('email-taken');
  if (!data.session) throw new AuthError('confirm-email');
  return data.session; // the SIGNED_IN event starts a sync (uploads what's already on this phone)
}

export async function signIn(email: string, password: string) {
  ensureConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toAuthError(error);
  return data.session; // the SIGNED_IN event starts a sync (downloads this account's data)
}

/** Uploads anything not synced yet, clears this phone's copy, then signs out. */
export async function signOut() {
  await finishAndClearLocalData();
  await supabase.auth.signOut();
}

/**
 * Permanently deletes the signed-in account: profile picture, the account itself and all
 * its synced data (every cloud table is linked to the account and deleted with it), then
 * this phone's copy. Needs internet. Throws AuthError('offline') if the server can't be reached.
 */
export async function deleteAccount() {
  ensureConfigured();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new AuthError('unknown', 'Not signed in.');

  // Profile picture file (ignore "not found").
  await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`]);

  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw toAuthError(error);

  await clearLocalData();
  // The account is gone on the server; just forget the session on this phone.
  await supabase.auth.signOut({ scope: 'local' });
}

/** The saved session (works offline), or null when signed out. */
export async function getSession(): Promise<Session | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

function ensureConfigured() {
  if (!supabaseConfigured) throw new AuthError('not-configured');
}

function toAuthError(error: { code?: string; status?: number; message: string }) {
  switch (error.code) {
    case 'invalid_credentials':
      return new AuthError('wrong-credentials', error.message);
    case 'user_already_exists':
    case 'email_exists':
      return new AuthError('email-taken', error.message);
    case 'email_not_confirmed':
      return new AuthError('confirm-email', error.message);
    case 'weak_password':
      return new AuthError('weak-password', error.message);
  }
  if (!error.status || /network|fetch/i.test(error.message)) return new AuthError('offline', error.message);
  return new AuthError('unknown', error.message);
}

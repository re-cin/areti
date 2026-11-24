import type { Session } from '@supabase/supabase-js';
import { clearLocalData, finishAndClearLocalData } from '@/sync/sync';
import { supabase, supabaseConfigured } from './supabase';
import { normalizeUsername } from './username';

/**
 * Accounts are Supabase Auth (email + password), so the same account works on any phone.
 * Study data stays in SQLite on the phone and syncs to Supabase (src/sync/sync.ts).
 */

/**
 * Spaces at the start or end of a password are ignored everywhere (sign up, sign in, reset).
 * Android keyboards add a trailing space when you pick a suggestion, which you can't see.
 */
export const cleanPassword = (password: string) => password.trim();

/** Shortest password allowed when creating one. */
export const MIN_PASSWORD_LENGTH = 8;

export type AuthErrorCode =
  | 'email-taken'
  | 'username-taken'
  | 'wrong-credentials'
  | 'confirm-email' // account exists but the email isn't confirmed yet
  | 'weak-password'
  | 'wrong-code' // emailed code is wrong or expired
  | 'same-password' // new password is the same as the old one
  | 'rate-limited' // too many emails / attempts, try again later
  | 'offline'
  | 'not-configured'
  | 'unknown';

export class AuthError extends Error {
  /** For 'confirm-email' after a username sign-in: the account's email, for the code screen. */
  email?: string;
  constructor(public code: AuthErrorCode, message?: string, email?: string) {
    super(message ?? code);
    this.email = email;
    this.name = 'AuthError';
  }
}

/**
 * Creates an account. With email confirmation on (Supabase > Auth > Sign In / Providers > Confirm email),
 * Supabase emails a 6-digit code and this throws AuthError('confirm-email'): show the code screen
 * (app/verify-email.tsx), then call verifySignUpCode. The "Confirm signup" email template must include {{ .Token }}.
 */
export async function signUp(email: string, password: string, username: string) {
  ensureConfigured();
  const name = normalizeUsername(username);
  // Checked first so the usual case gets a clear message. Supabase's unique index is the real guard.
  if (!(await isUsernameAvailable(name))) throw new AuthError('username-taken');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: cleanPassword(password),
    options: { data: { username: name } }, // saved to public.usernames by a database trigger
  });
  // Someone took the username a moment ago: the database refuses the new user.
  if (error && /database error/i.test(error.message)) throw new AuthError('username-taken', error.message);
  if (error) throw toAuthError(error);
  // With email confirmation on, Supabase hides "already registered" by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0) throw new AuthError('email-taken');
  if (!data.session) throw new AuthError('confirm-email');
  return data.session; // the SIGNED_IN event starts a sync (uploads what's already on this phone)
}

export async function signIn(email: string, password: string) {
  ensureConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: cleanPassword(password) });
  if (error) throw toAuthError(error);
  return data.session; // the SIGNED_IN event starts a sync (downloads this account's data)
}

/** True if nobody has this username yet (public.username_available). Throws when offline. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('username_available', { p_username: normalizeUsername(username) });
  if (error) throw toAuthError({ ...error, status: 0 });
  return data === true;
}

/**
 * Sign in with a username. The username-sign-in edge function finds the account's email on the
 * server (emails stay private) and signs in; the app then uses the session it returns.
 */
export async function signInWithUsername(username: string, password: string) {
  ensureConfigured();
  const { data, error } = await supabase.functions.invoke('username-sign-in', {
    body: { username: normalizeUsername(username), password: cleanPassword(password) },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const payload = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    switch (payload?.error) {
      case 'wrong-credentials':
        throw new AuthError('wrong-credentials');
      case 'confirm-email':
        throw new AuthError('confirm-email', undefined, payload.email);
      case 'rate-limited':
        throw new AuthError('rate-limited');
      case undefined:
        throw new AuthError('offline', error.message);
      default:
        throw new AuthError('unknown', payload?.message);
    }
  }
  const { data: signedIn, error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) throw toAuthError(sessionError);
  return signedIn.session; // the SIGNED_IN event starts a sync
}

/** Sign Up, step 2: checks the emailed code. On success the account is confirmed and signed in. */
export async function verifySignUpCode(email: string, code: string) {
  ensureConfigured();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.replace(/\s/g, ''),
    type: 'email',
  });
  if (error) throw toAuthError(error);
  return data.session; // the SIGNED_IN event starts a sync
}

/** Emails a new sign-up code (also used when someone signs in before confirming). */
export async function resendSignUpCode(email: string) {
  ensureConfigured();
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
  if (error) throw toAuthError(error);
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

/**
 * Forgot Password, step 1: emails a reset code to the address.
 * (Supabase's "Reset Password" email template must include {{ .Token }}.)
 * For privacy Supabase doesn't say whether the email has an account; it just sends if it does.
 */
export async function sendPasswordResetCode(email: string) {
  ensureConfigured();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw toAuthError(error);
}

/** Forgot Password, step 2: checks the emailed code, sets the new password, and signs in. */
export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  ensureConfigured();
  const { error: codeError } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.replace(/\s/g, ''),
    type: 'recovery',
  });
  if (codeError) throw toAuthError(codeError);
  const { error } = await supabase.auth.updateUser({ password: cleanPassword(newPassword) });
  if (error) throw toAuthError(error);
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
    case 'otp_expired':
    case 'otp_disabled':
      return new AuthError('wrong-code', error.message);
    case 'same_password':
      return new AuthError('same-password', error.message);
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new AuthError('rate-limited', error.message);
  }
  if (!error.status || /network|fetch/i.test(error.message)) return new AuthError('offline', error.message);
  return new AuthError('unknown', error.message);
}

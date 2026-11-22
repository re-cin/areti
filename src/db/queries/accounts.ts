import { and, eq, isNull } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '../client';
import { newId } from '../id';
import { accounts, settings } from '../schema';

/**
 * Local email + password accounts, stored in SQLite on this device.
 *
 * Passwords are never saved. We store a random salt and the result of hashing
 * salt + password with SHA-256 many times over (key stretching), which makes guessing
 * slow. This protects the password if someone copies the database file, but it is
 * device-only: there is no server yet, so accounts don't move between phones.
 */

/** Hashing rounds for new passwords. Stored per account so it can be raised later. */
const PASSWORD_ROUNDS = 1000;
const SESSION_KEY = 'session';

export type Account = { id: string; email: string };
export type Session = { kind: 'account'; accountId: string };

export type AuthErrorCode = 'email-taken' | 'wrong-credentials';
export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Creates an account and signs it in. Throws AuthError('email-taken') if the email is used. */
export async function signUp(email: string, password: string): Promise<Account> {
  const normalized = normalizeEmail(email);
  if (await findAccountByEmail(normalized)) throw new AuthError('email-taken');

  const salt = toHex(Crypto.getRandomBytes(16));
  const passwordHash = await hashPassword(password, salt, PASSWORD_ROUNDS);
  const now = Date.now();
  const account: Account = { id: newId(), email: normalized };

  await db.insert(accounts).values({
    id: account.id,
    email: normalized,
    passwordHash,
    passwordSalt: salt,
    passwordRounds: PASSWORD_ROUNDS,
    createdAt: now,
    updatedAt: now,
  });
  await saveSession({ kind: 'account', accountId: account.id });
  return account;
}

/** Signs in. Throws AuthError('wrong-credentials') if the email or password is wrong. */
export async function signIn(email: string, password: string): Promise<Account> {
  const row = await findAccountByEmail(normalizeEmail(email));
  // Same error for "no such email" and "wrong password", so emails can't be probed.
  if (!row) throw new AuthError('wrong-credentials');

  const hash = await hashPassword(password, row.passwordSalt, row.passwordRounds);
  if (!safeEqual(hash, row.passwordHash)) throw new AuthError('wrong-credentials');

  await saveSession({ kind: 'account', accountId: row.id });
  return { id: row.id, email: row.email };
}

export async function signOut() {
  await db.delete(settings).where(eq(settings.key, SESSION_KEY));
}

/** The saved session, or null if nobody is signed in. */
export async function getSession(): Promise<Session | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SESSION_KEY));
  if (!row) return null;
  try {
    const session = JSON.parse(row.value) as Partial<Session>;
    // Only account sessions count (older builds could save a "guest" session).
    if (session.kind !== 'account' || !session.accountId) return null;
    // Make sure the account still exists (and wasn't deleted).
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, session.accountId), isNull(accounts.deletedAt)));
    return account ? { kind: 'account', accountId: session.accountId } : null;
  } catch {
    return null;
  }
}

/** The signed-in account, or null when signed out. */
export async function getCurrentAccount(): Promise<Account | null> {
  const session = await getSession();
  if (session?.kind !== 'account') return null;
  const [row] = await db
    .select({ id: accounts.id, email: accounts.email })
    .from(accounts)
    .where(eq(accounts.id, session.accountId));
  return row ?? null;
}

// ---------------------------------------------------------------------------

async function findAccountByEmail(normalizedEmail: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.email, normalizedEmail), isNull(accounts.deletedAt)));
  return row ?? null;
}

async function saveSession(session: Session) {
  const value = JSON.stringify(session);
  const updatedAt = Date.now();
  await db
    .insert(settings)
    .values({ key: SESSION_KEY, value, updatedAt })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } });
}

/** SHA-256 of salt + password, then re-hashed (rounds - 1) more times. Returns hex. */
async function hashPassword(password: string, salt: string, rounds: number) {
  let hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
  for (let i = 1; i < rounds; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${hash}`);
  }
  return hash;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares two strings in constant time (doesn't stop at the first different character). */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

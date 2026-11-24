/**
 * Username rules (same as the usernames_format check in Supabase):
 * 3-20 characters; lowercase letters, numbers, underscore and dot; starts with a letter or number.
 * Pure TypeScript so it is easy to test.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** What the user typed, the way it is saved: no spaces around it, lowercase. */
export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

/** Why this username can't be used, or null if it looks fine (still has to be free). */
export function usernameProblem(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (!u) return 'Choose a username.';
  if (u.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters for your username.`;
  if (u.length > USERNAME_MAX) return `Use at most ${USERNAME_MAX} characters for your username.`;
  if (!/^[a-z0-9_.]+$/.test(u)) return 'Usernames can only use letters, numbers, _ and .';
  if (!/^[a-z0-9]/.test(u)) return 'Start your username with a letter or number.';
  return null;
}

/** Sign In accepts an email or a username: anything with an @ is treated as an email. */
export const looksLikeEmail = (value: string) => value.includes('@');

/** Longest display name (same limit as the sign-up trigger in Supabase). */
export const DISPLAY_NAME_MAX = 40;

/** Spaces around the name are dropped; inner runs of spaces become one. */
export const cleanDisplayName = (raw: string) => raw.trim().replace(/\s+/g, ' ');

/** Why this display name can't be used, or null if it's fine. Display names don't need to be unique. */
export function displayNameProblem(raw: string): string | null {
  const name = cleanDisplayName(raw);
  if (!name) return 'Enter your display name.';
  if (name.length > DISPLAY_NAME_MAX) return `Use at most ${DISPLAY_NAME_MAX} characters for your display name.`;
  return null;
}

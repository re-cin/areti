import { looksLikeEmail, normalizeUsername, usernameProblem } from './username';

describe('usernames', () => {
  it('accepts letters, numbers, _ and . (saved lowercase)', () => {
    expect(usernameProblem('ryan_b')).toBeNull();
    expect(usernameProblem('  Ryan.B2  ')).toBeNull();
    expect(normalizeUsername('  Ryan.B2  ')).toBe('ryan.b2');
  });
  it('explains what is wrong', () => {
    expect(usernameProblem('')).toBe('Choose a username.');
    expect(usernameProblem('ab')).toMatch(/at least 3/);
    expect(usernameProblem('a'.repeat(21))).toMatch(/at most 20/);
    expect(usernameProblem('ryan b')).toMatch(/only use/);
    expect(usernameProblem('ryan!')).toMatch(/only use/);
    expect(usernameProblem('_ryan')).toMatch(/Start/);
  });
  it('tells emails from usernames', () => {
    expect(looksLikeEmail('ryan@example.com')).toBe(true);
    expect(looksLikeEmail('ryan_b')).toBe(false);
  });
});

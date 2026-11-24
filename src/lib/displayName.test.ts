import { cleanDisplayName, displayNameProblem } from './displayName';

describe('display names', () => {
  it('tidies spaces', () => {
    expect(cleanDisplayName('  Ryan   Butalid ')).toBe('Ryan Butalid');
  });
  it('requires a name up to 40 characters', () => {
    expect(displayNameProblem('Ryan')).toBeNull();
    expect(displayNameProblem('   ')).toBe('Enter your display name.');
    expect(displayNameProblem('a'.repeat(41))).toMatch(/at most 40/);
  });
});

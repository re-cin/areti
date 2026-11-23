import { PremiumRequiredError } from './entitlements';
import { GenerationLimitError, GenerationUnavailableError, parseConsumeResult, parseQuota, remainingGenerations, resetLabel } from './generationQuota';

const resets = Date.UTC(2026, 11, 1);

describe('generation quota', () => {
  it('reads the usage reply, treating anything unexpected as unknown', () => {
    expect(parseQuota({ premium: false, limit: 3, used: 1, resets_at: '2026-12-01T00:00:00+00:00' })).toEqual({ limit: 3, used: 1, resetsAt: resets });
    expect(parseQuota({ premium: true })).toBe('premium');
    for (const raw of [null, undefined, 'x', 5, {}, { limit: 3 }, { limit: 3, used: -1, resets_at: '2026-12-01T00:00:00Z' },
      { limit: 3, used: 1, resets_at: 'soon' }, { limit: '3', used: 1, resets_at: '2026-12-01T00:00:00Z' }]) {
      expect(parseQuota(raw)).toBeNull();
    }
  });

  it('allows a generation only when the server says so', () => {
    expect(parseConsumeResult({ allowed: true, limit: 3, used: 2 })).toEqual({ allowed: true });
    expect(parseConsumeResult({ allowed: true, premium: true })).toEqual({ allowed: true });
    expect(parseConsumeResult({ allowed: false, limit: 3, used: 3, resets_at: '2026-12-01T00:00:00Z' }))
      .toEqual({ allowed: false, quota: { limit: 3, used: 3, resetsAt: resets } });
    for (const raw of [null, undefined, 'yes', {}, { allowed: 'true' }, { allowed: false }, { allowed: false, limit: 3, used: 3 }]) {
      expect(parseConsumeResult(raw)).toBeNull(); // unknown replies block generating, never grant it
    }
  });

  it('counts what is left and never goes negative', () => {
    expect(remainingGenerations({ limit: 3, used: 0, resetsAt: resets })).toBe(3);
    expect(remainingGenerations({ limit: 3, used: 3, resetsAt: resets })).toBe(0);
    expect(remainingGenerations({ limit: 3, used: 5, resetsAt: resets })).toBe(0);
  });

  it('names the reset day in UTC and shows the upgrade prompt through PremiumRequiredError', () => {
    expect(resetLabel(resets)).toBe('December 1');
    const error = new GenerationLimitError(3, resets);
    expect(error).toBeInstanceOf(PremiumRequiredError);
    expect(error.message).toContain('3 free schedule generations');
    expect(error.message).toContain('December 1');
    expect(new GenerationUnavailableError().message).toContain('Connect to the internet');
  });
});

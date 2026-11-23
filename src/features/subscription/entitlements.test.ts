import { FREE_MONTHLY_GENERATIONS, PRIORITY_MULTIPLIER, entitlementsFor, generationsAreLimited, isExamPriority, parseSubscription, resolveTier } from './entitlements';

describe('entitlements', () => {
  it('gives Free a monthly generation allowance and Premium automatic, adaptive planning', () => {
    expect(entitlementsFor('free')).toMatchObject({ autoScheduling: false, monthlyGenerations: 3, priorityControls: false, autoMissedRecovery: false, detailedInsights: false });
    expect(entitlementsFor('premium')).toMatchObject({ autoScheduling: true, monthlyGenerations: Infinity, priorityControls: true, autoMissedRecovery: true, detailedInsights: true });
    expect(FREE_MONTHLY_GENERATIONS).toBe(3);
  });

  it('only caps generations for Free', () => {
    expect(generationsAreLimited(entitlementsFor('free'))).toBe(true);
    expect(generationsAreLimited(entitlementsFor('premium'))).toBe(false);
  });

  it('only trusts a well-formed, unexpired premium record', () => {
    const now = 1_000;
    expect(resolveTier(null, now)).toBe('free');
    expect(resolveTier({ plan: 'free', expiresAt: null }, now)).toBe('free');
    expect(resolveTier({ plan: 'premium', expiresAt: null }, now)).toBe('premium');
    expect(resolveTier({ plan: 'premium', expiresAt: now + 1 }, now)).toBe('premium');
    expect(resolveTier({ plan: 'premium', expiresAt: now }, now)).toBe('free');
    expect(resolveTier({ plan: 'premium', expiresAt: now - 1 }, now)).toBe('free');
  });

  it('treats unreadable cached subscriptions as Free', () => {
    for (const raw of [undefined, null, '', '{bad', 'null', '"premium"', '{"plan":"gold"}', '{"plan":5}']) {
      expect(parseSubscription(raw)).toBeNull();
    }
    expect(parseSubscription('{"plan":"premium"}')).toEqual({ plan: 'premium', expiresAt: null });
    expect(parseSubscription('{"plan":"premium","expiresAt":"soon"}')).toEqual({ plan: 'premium', expiresAt: null });
  });

  it('validates priorities and keeps Normal neutral', () => {
    expect(PRIORITY_MULTIPLIER.normal).toBe(1);
    expect(isExamPriority('high')).toBe(true);
    expect(isExamPriority('urgent')).toBe(false);
    expect(isExamPriority(2)).toBe(false);
  });
});

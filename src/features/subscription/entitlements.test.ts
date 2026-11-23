import { PRIORITY_MULTIPLIER, entitlementsFor, isExamPriority, parseSubscription, resolveTier, scheduledPlanIds } from './entitlements';

describe('entitlements', () => {
  it('gives Free basic automatic planning and Premium adaptive planning', () => {
    expect(entitlementsFor('free')).toMatchObject({ maxScheduledPlans: 1, priorityControls: false, autoMissedRecovery: false, detailedInsights: false });
    expect(entitlementsFor('premium')).toMatchObject({ maxScheduledPlans: Infinity, priorityControls: true, autoMissedRecovery: true, detailedInsights: true });
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

  it('schedules the nearest exams first, with a stable tie-break', () => {
    const plans = [{ id: 'c', examDate: 30 }, { id: 'b', examDate: 10 }, { id: 'a', examDate: 10 }];
    expect([...scheduledPlanIds(plans, 1)]).toEqual(['a']);
    expect([...scheduledPlanIds(plans, 2)].sort()).toEqual(['a', 'b']);
    expect(scheduledPlanIds(plans, Infinity).size).toBe(3);
    expect(scheduledPlanIds(plans, 0).size).toBe(0);
  });

  it('validates priorities and keeps Normal neutral', () => {
    expect(PRIORITY_MULTIPLIER.normal).toBe(1);
    expect(isExamPriority('high')).toBe(true);
    expect(isExamPriority('urgent')).toBe(false);
    expect(isExamPriority(2)).toBe(false);
  });
});

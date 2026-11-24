import { FREE_MONTHLY_GENERATIONS, entitlementsFor, generationsAreLimited, parseSubscription, recordFromRow, renewedTo, resolveTier } from './entitlements';

describe('entitlements', () => {
  it('gives Free a monthly generation allowance and Premium automatic, adaptive planning', () => {
    expect(entitlementsFor('free')).toMatchObject({ autoScheduling: false, monthlyGenerations: 3, autoMissedRecovery: false, detailedInsights: false });
    expect(entitlementsFor('premium')).toMatchObject({ autoScheduling: true, monthlyGenerations: Infinity, autoMissedRecovery: true, detailedInsights: true });
    expect(FREE_MONTHLY_GENERATIONS).toBe(3);
  });

  it('only caps generations for Free', () => {
    expect(generationsAreLimited(entitlementsFor('free'))).toBe(true);
    expect(generationsAreLimited(entitlementsFor('premium'))).toBe(false);
  });

  it('keeps active Premium past its due time and ends canceled Premium at it', () => {
    const now = 1_000;
    expect(resolveTier(null, now)).toBe('free');
    expect(resolveTier({ plan: 'free', expiresAt: null }, now)).toBe('free');
    expect(resolveTier({ plan: 'premium', expiresAt: null }, now)).toBe('premium');
    expect(resolveTier({ plan: 'premium', expiresAt: now + 1 }, now)).toBe('premium');
    // Active subscriptions renew at the due time, so they stay Premium past it.
    expect(resolveTier({ plan: 'premium', expiresAt: now - 1 }, now)).toBe('premium');
    // A canceled one ends at its due time.
    expect(resolveTier({ plan: 'premium', expiresAt: now + 1, canceled: true }, now)).toBe('premium');
    expect(resolveTier({ plan: 'premium', expiresAt: now, canceled: true }, now)).toBe('free');
    expect(resolveTier({ plan: 'premium', expiresAt: now - 1, canceled: true }, now)).toBe('free');
  });

  it('treats unreadable cached subscriptions as Free', () => {
    for (const raw of [undefined, null, '', '{bad', 'null', '"premium"', '{"plan":"gold"}', '{"plan":5}']) {
      expect(parseSubscription(raw)).toBeNull();
    }
    expect(parseSubscription('{"plan":"premium"}')).toEqual({ plan: 'premium', expiresAt: null });
    expect(parseSubscription('{"plan":"premium","expiresAt":"soon"}')).toEqual({ plan: 'premium', expiresAt: null });
  });

});

describe('recordFromRow', () => {
  const end = '2026-12-01T10:00:00.000Z';
  const endMs = Date.parse(end);
  it('active and trial subscriptions are Premium', () => {
    expect(recordFromRow({ plan: 'premium', status: 'active', current_period_end: end })).toEqual({ plan: 'premium', expiresAt: endMs });
    expect(recordFromRow({ plan: 'premium', status: 'trialing', current_period_end: null })).toEqual({ plan: 'premium', expiresAt: null });
  });
  it('a canceled subscription keeps Premium until its due time', () => {
    const record = recordFromRow({ plan: 'premium', status: 'canceled', current_period_end: end });
    expect(record).toEqual({ plan: 'premium', expiresAt: endMs, canceled: true });
    expect(resolveTier(record, endMs - 1)).toBe('premium');
    expect(resolveTier(record, endMs)).toBe('free');
    expect(parseSubscription(JSON.stringify(record))).toEqual(record);
  });
  it('canceled without a due time, expired, Free or no row is Free', () => {
    expect(recordFromRow({ plan: 'premium', status: 'canceled', current_period_end: null }).plan).toBe('free');
    expect(recordFromRow({ plan: 'premium', status: 'expired', current_period_end: end }).plan).toBe('free');
    expect(recordFromRow({ plan: 'free', status: 'active', current_period_end: null }).plan).toBe('free');
    expect(recordFromRow(null)).toEqual({ plan: 'free', expiresAt: null });
  });
});

describe('renewedTo', () => {
  const now = 10_000;
  const active = (expiresAt: number) => ({ plan: 'premium' as const, expiresAt });
  it('spots an automatic renewal after the due time', () => {
    expect(renewedTo(active(now - 1), active(now + 500), now)).toBe(now + 500);
  });
  it('ignores admin edits before the due time, cancels, new purchases and Free', () => {
    expect(renewedTo(active(now + 100), active(now + 500), now)).toBeNull();
    expect(renewedTo(active(now - 1), { ...active(now + 500), canceled: true }, now)).toBeNull();
    expect(renewedTo({ ...active(now - 1), canceled: true }, active(now + 500), now)).toBeNull();
    expect(renewedTo({ plan: 'free', expiresAt: null }, active(now + 500), now)).toBeNull();
    expect(renewedTo(null, active(now + 500), now)).toBeNull();
    expect(renewedTo(active(now - 1), { plan: 'free', expiresAt: null }, now)).toBeNull();
  });
});

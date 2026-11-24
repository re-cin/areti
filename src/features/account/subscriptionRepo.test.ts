jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({ supabase: {}, supabaseConfigured: false }));
jest.mock('@/features/settings/settingsRepo', () => ({ getSetting: jest.fn(), setSetting: jest.fn(), SETTING_KEYS: { profile: 'profile' } }));
jest.mock('@/stores/dataVersion', () => ({ bumpData: jest.fn() }));

import { isPremiumNow } from './subscriptionRepo';

const NOW = Date.parse('2026-11-24T00:00:00Z');
const LATER = NOW + 86_400_000;
const EARLIER = NOW - 86_400_000;

describe('isPremiumNow', () => {
  it('free plan is never Premium', () => {
    expect(isPremiumNow('free', 'active', null, NOW)).toBe(false);
  });

  it('active or trialing Premium inside the period is Premium', () => {
    expect(isPremiumNow('premium', 'active', LATER, NOW)).toBe(true);
    expect(isPremiumNow('premium', 'trialing', LATER, NOW)).toBe(true);
    expect(isPremiumNow('premium', 'active', null, NOW)).toBe(true); // no end date
  });

  it('canceled keeps Premium until the paid period ends', () => {
    expect(isPremiumNow('premium', 'canceled', LATER, NOW)).toBe(true);
    expect(isPremiumNow('premium', 'canceled', EARLIER, NOW)).toBe(false);
  });

  it('expired, or a period that has ended, is not Premium', () => {
    expect(isPremiumNow('premium', 'expired', LATER, NOW)).toBe(false);
    expect(isPremiumNow('premium', 'active', EARLIER, NOW)).toBe(false);
  });
});

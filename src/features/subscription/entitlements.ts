// Free vs Premium rules. Pure TypeScript: NO imports from Expo, React Native or the database.
// Free = exams and manual sessions, plus a few schedule generations a month.
// Premium = automatic, adaptive scheduling. Both tiers use the same scheduling engine;
// these flags only switch capabilities on.

export type PlanTier = 'free' | 'premium';

/** Schedule generations a Free student gets per calendar month (UTC). Must match the server function. */
export const FREE_MONTHLY_GENERATIONS = 3;

export type Entitlements = {
  tier: PlanTier;
  /**
   * Schedules refresh on their own (new exams, edits, missed work). Free students keep unlimited exams
   * and manual sessions, but a schedule is only generated when they ask for one (see monthlyGenerations).
   */
  autoScheduling: boolean;
  /** How many times a month the student can generate or regenerate a schedule. Infinity = unlimited. */
  monthlyGenerations: number;
  /** Missed sessions are moved automatically; Free students reschedule them by hand. */
  autoMissedRecovery: boolean;
  /** Missed-session, time-left and workload-fit analysis instead of basic progress only. */
  detailedInsights: boolean;
};

const FREE: Entitlements = {
  tier: 'free', autoScheduling: false, monthlyGenerations: FREE_MONTHLY_GENERATIONS,
  autoMissedRecovery: false, detailedInsights: false,
};
const PREMIUM: Entitlements = {
  tier: 'premium', autoScheduling: true, monthlyGenerations: Infinity,
  autoMissedRecovery: true, detailedInsights: true,
};

export const entitlementsFor = (tier: PlanTier): Entitlements => (tier === 'premium' ? PREMIUM : FREE);

/** Local cache of the server's subscription row. Never uploaded: the server is the authority. */
export const SUBSCRIPTION_SETTING_KEY = 'subscription.plan';

export type SubscriptionRecord = {
  plan: PlanTier;
  /** epoch ms, null = no expiry */
  expiresAt: number | null;
  /** Canceled: Premium stays until expiresAt, then ends (no renewal). Left out when not canceled. */
  canceled?: true;
};

/** The server's subscriptions row, as refreshSubscription reads it. */
export type SubscriptionRow = { plan: string; status: string; current_period_end: string | null };

/**
 * Turns the server row into the phone's cached record.
 * Active and trial subscriptions are Premium. A canceled one keeps Premium until its due time
 * (that's when the 24 h / 1 h reminders show), then ends. Expired, or anything else, is Free.
 */
export function recordFromRow(row: SubscriptionRow | null): SubscriptionRecord {
  if (!row) return { plan: 'free', expiresAt: null };
  const parsed = row.current_period_end ? Date.parse(row.current_period_end) : NaN;
  const expiresAt = Number.isFinite(parsed) ? parsed : null;
  if (row.plan !== 'premium') return { plan: 'free', expiresAt };
  if (row.status === 'active' || row.status === 'trialing') return { plan: 'premium', expiresAt };
  // Canceled without a due time has nothing left to run out: Free straight away.
  if (row.status === 'canceled' && expiresAt !== null) return { plan: 'premium', expiresAt, canceled: true };
  return { plan: 'free', expiresAt };
}

/**
 * The new due time if the subscription just renewed on its own, else null.
 * Renewed = still active (not canceled), the old due time has passed, and the server moved it later.
 * An admin moving a future due time, a new purchase or a cancel is not a renewal.
 */
export function renewedTo(prev: SubscriptionRecord | null, next: SubscriptionRecord, now: number): number | null {
  if (!prev || prev.plan !== 'premium' || prev.canceled || prev.expiresAt === null) return null;
  if (next.plan !== 'premium' || next.canceled || next.expiresAt === null) return null;
  return prev.expiresAt <= now && next.expiresAt > prev.expiresAt ? next.expiresAt : null;
}

/** Parses the cached JSON. Anything unreadable or unexpected is treated as Free. */
export function parseSubscription(raw: string | null | undefined): SubscriptionRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SubscriptionRecord> | null;
    if (!value || (value.plan !== 'free' && value.plan !== 'premium')) return null;
    const expiresAt = typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt) ? value.expiresAt : null;
    return value.canceled === true ? { plan: value.plan, expiresAt, canceled: true } : { plan: value.plan, expiresAt };
  } catch {
    return null;
  }
}

/** Premium until a canceled subscription reaches its due time; missing, invalid or Free records are Free. */
export function resolveTier(record: SubscriptionRecord | null, now: number): PlanTier {
  if (!record || record.plan !== 'premium') return 'free';
  // An active subscription renews at its due time (the server moves it to the next one),
  // so only a canceled subscription runs out.
  if (!record.canceled) return 'premium';
  return record.expiresAt === null || record.expiresAt > now ? 'premium' : 'free';
}

/** Thrown when a Free student uses a Premium capability. The UI turns this into an upgrade prompt. */
export class PremiumRequiredError extends Error {
  readonly feature: string;
  constructor(feature: string) {
    super(`${feature} is a Premium feature.`);
    this.name = 'PremiumRequiredError';
    this.feature = feature;
  }
}

/** True when generating a schedule is capped per month, so each generation must be reserved on the server. */
export const generationsAreLimited = (entitlements: Entitlements): boolean => Number.isFinite(entitlements.monthlyGenerations);

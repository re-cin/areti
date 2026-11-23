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
  /** Student-adjusted exam priority (Normal / High / Highest). */
  priorityControls: boolean;
  /** Missed sessions are moved automatically; Free students reschedule them by hand. */
  autoMissedRecovery: boolean;
  /** Missed-session, time-left and workload-fit analysis instead of basic progress only. */
  detailedInsights: boolean;
};

const FREE: Entitlements = {
  tier: 'free', autoScheduling: false, monthlyGenerations: FREE_MONTHLY_GENERATIONS,
  priorityControls: false, autoMissedRecovery: false, detailedInsights: false,
};
const PREMIUM: Entitlements = {
  tier: 'premium', autoScheduling: true, monthlyGenerations: Infinity,
  priorityControls: true, autoMissedRecovery: true, detailedInsights: true,
};

export const entitlementsFor = (tier: PlanTier): Entitlements => (tier === 'premium' ? PREMIUM : FREE);

/** Local cache of the server's subscription row. Never uploaded: the server is the authority. */
export const SUBSCRIPTION_SETTING_KEY = 'subscription.plan';

export type SubscriptionRecord = { plan: PlanTier; /** epoch ms, null = no expiry */ expiresAt: number | null };

/** Parses the cached JSON. Anything unreadable or unexpected is treated as Free. */
export function parseSubscription(raw: string | null | undefined): SubscriptionRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SubscriptionRecord> | null;
    if (!value || (value.plan !== 'free' && value.plan !== 'premium')) return null;
    const expiresAt = typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt) ? value.expiresAt : null;
    return { plan: value.plan, expiresAt };
  } catch {
    return null;
  }
}

/** Premium only while it has not expired; missing, invalid or lapsed subscriptions are Free. */
export function resolveTier(record: SubscriptionRecord | null, now: number): PlanTier {
  if (!record || record.plan !== 'premium') return 'free';
  return record.expiresAt === null || record.expiresAt > now ? 'premium' : 'free';
}

/** Student-chosen emphasis for one exam. It re-shares the same study time; it never adds hours. */
export type ExamPriority = 'normal' | 'high' | 'highest';
export const EXAM_PRIORITIES: readonly ExamPriority[] = ['normal', 'high', 'highest'];
export const PRIORITY_MULTIPLIER: Record<ExamPriority, number> = { normal: 1, high: 1.5, highest: 2 };

export const isExamPriority = (value: unknown): value is ExamPriority =>
  typeof value === 'string' && (EXAM_PRIORITIES as readonly string[]).includes(value);

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

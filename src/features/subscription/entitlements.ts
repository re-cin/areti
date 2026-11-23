// Free vs Premium rules. Pure TypeScript: NO imports from Expo, React Native or the database.
// Free = basic automatic planning. Premium = adaptive automatic planning.
// Both tiers use the same scheduling engine; these flags only switch capabilities on.

export type PlanTier = 'free' | 'premium';

export type Entitlements = {
  tier: PlanTier;
  /** How many exams get an automatic study schedule at once. Exams themselves are unlimited. */
  maxScheduledPlans: number;
  /** Student-adjusted exam priority (Normal / High / Highest). */
  priorityControls: boolean;
  /** Missed sessions are moved automatically; Free students reschedule them by hand. */
  autoMissedRecovery: boolean;
  /** Missed-session, time-left and workload-fit analysis instead of basic progress only. */
  detailedInsights: boolean;
};

const FREE: Entitlements = {
  tier: 'free', maxScheduledPlans: 1, priorityControls: false, autoMissedRecovery: false, detailedInsights: false,
};
const PREMIUM: Entitlements = {
  tier: 'premium', maxScheduledPlans: Infinity, priorityControls: true, autoMissedRecovery: true, detailedInsights: true,
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

/**
 * Which exams receive automatic scheduling. Everything stays visible and trackable; only the
 * nearest deadlines (up to the tier's limit) are scheduled. Deterministic: date, then id.
 */
export function scheduledPlanIds(plans: { id: string; examDate: number }[], max: number): Set<string> {
  const ordered = [...plans].sort((a, b) => a.examDate - b.examDate || a.id.localeCompare(b.id));
  return new Set((Number.isFinite(max) ? ordered.slice(0, Math.max(0, max)) : ordered).map(p => p.id));
}

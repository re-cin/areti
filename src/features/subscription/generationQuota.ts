// Monthly schedule-generation allowance for Free students. Pure TypeScript: no Expo, React Native or database.
// The server (supabase function consume_schedule_generation) is the authority; this file only
// describes its replies and turns them into errors and display text.

import { PremiumRequiredError } from './entitlements';

/** What the server reports about this month's generations for a Free student. */
export type GenerationQuota = {
  limit: number;
  used: number;
  /** epoch ms when the count returns to 0 (first moment of next month, UTC) */
  resetsAt: number;
};

export type DateFormat = 'dd/mm/yy' | 'mm/dd/yy' | 'yyyy-mm-dd';

export const remainingGenerations = (quota: GenerationQuota): number =>
  Math.max(0, quota.limit - quota.used);

export const resetLabel = (
  resetsAt: number,
  dateFormat: DateFormat = 'dd/mm/yy',
): string => {
  const date = new Date(resetsAt);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  switch (dateFormat) {
    case 'mm/dd/yy':
      return `${month}/${day}/${String(year).slice(-2)}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'dd/mm/yy':
    default:
      return `${day}/${month}/${String(year).slice(-2)}`;
  }
};

/** The Free allowance is used up. Extends PremiumRequiredError so the UI shows the upgrade prompt. */
export class GenerationLimitError extends PremiumRequiredError {
  readonly limit: number;
  readonly resetsAt: number;

  constructor(limit: number, resetsAt: number) {
    super('Unlimited schedule generation');
    this.name = 'GenerationLimitError';
    this.limit = limit;
    this.resetsAt = resetsAt;
    this.message = `You’ve used all ${limit} free schedule generations this month. They reset on ${resetLabel(resetsAt)}, or upgrade to Premium for unlimited schedules.`;
  }
}

/** The server could not confirm the allowance (offline, signed out or an error). Nothing is generated. */
export class GenerationUnavailableError extends Error {
  constructor(
    detail?: string,
    cause: 'connection' | 'server-schema' = 'connection',
  ) {
    super(
      cause === 'server-schema'
        ? 'Schedule generation is unavailable because the server database needs an update. Please try again after it is updated.'
        : `Connect to the internet and sign in to generate a schedule on the Free plan.${detail ? ` (${detail})` : ''}`,
    );
    this.name = 'GenerationUnavailableError';
  }
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function parseResetsAt(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** Reads the usage reply. Anything unexpected is null (shown as "unknown", never as a free pass). */
export function parseQuota(
  raw: unknown,
): GenerationQuota | 'premium' | null {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Record<string, unknown>;

  if (value.premium === true) return 'premium';

  const resetsAt = parseResetsAt(value.resets_at);

  if (
    !finite(value.limit) ||
    !finite(value.used) ||
    value.limit < 0 ||
    value.used < 0 ||
    resetsAt === null
  ) {
    return null;
  }

  return {
    limit: value.limit,
    used: value.used,
    resetsAt,
  };
}

export type ConsumeResult =
  | { allowed: true }
  | { allowed: false; quota: GenerationQuota };

/** Reads the reply to "use one generation". Unknown shapes are null, which blocks generating. */
export function parseConsumeResult(
  raw: unknown,
): ConsumeResult | null {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Record<string, unknown>;

  if (value.allowed === true) return { allowed: true };
  if (value.allowed !== false) return null;

  const quota = parseQuota(value);

  return quota && quota !== 'premium'
    ? { allowed: false, quota }
    : null;
}
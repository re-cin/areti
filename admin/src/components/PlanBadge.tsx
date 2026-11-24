import type { Plan, SubscriptionStatus } from '../lib/types';
import { Icon } from './Icon';

export function PlanBadge({ plan }: { plan: Plan }) {
  if (plan === 'premium') {
    return (
      <span className="badge badge-premium">
        <Icon name="crown" size={14} color="var(--gold)" strokeWidth={1.5} />
        Premium
      </span>
    );
  }
  return <span className="badge badge-free">Free</span>;
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: 'Active',
  trialing: 'Trial',
  canceled: 'Canceled',
  expired: 'Expired',
};

export function StatusLabel({ status }: { status: SubscriptionStatus }) {
  return <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export const STATUS_OPTIONS = Object.entries(STATUS_LABEL) as [SubscriptionStatus, string][];

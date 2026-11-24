import { useState } from 'react';
import { updateSubscription } from '../lib/api';
import type { AdminUser, BillingPeriod, Plan, SubscriptionStatus } from '../lib/types';
import { Avatar } from './Avatar';
import { Dropdown } from './Dropdown';
import { Icon } from './Icon';

type EditableUser = Pick<AdminUser, 'id' | 'email' | 'display_name' | 'picture_uri' | 'plan' | 'subscription_status' | 'billing_period' | 'current_period_end'>;
type Props = { user: EditableUser; onClose: () => void; onSaved: () => void };

const PERIODS: { value: BillingPeriod; label: string; hint: string }[] = [
  { value: 'weekly', label: 'Weekly', hint: '7 days' },
  { value: 'monthly', label: 'Monthly', hint: '1 month' },
  { value: 'yearly', label: 'Yearly', hint: '1 year' },
];

const toDateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Today plus one billing period, as YYYY-MM-DD. */
function nextDue(period: BillingPeriod) {
  const d = new Date();
  if (period === 'weekly') d.setDate(d.getDate() + 7);
  else if (period === 'monthly') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return toDateInput(d);
}

export function EditSubscriptionModal({ user, onClose, onSaved }: Props) {
  const [plan, setPlan] = useState<Plan>(user.plan);
  const [period, setPeriod] = useState<BillingPeriod>(user.billing_period ?? 'monthly');
  const [status, setStatus] = useState<SubscriptionStatus>(user.subscription_status);
  const [due, setDue] = useState(user.current_period_end ? user.current_period_end.slice(0, 10) : nextDue(user.billing_period ?? 'monthly'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPlan = (next: Plan) => {
    setPlan(next);
    if (next === 'premium' && user.plan !== 'premium') {
      setStatus('active');
      setDue(nextDue(period));
    }
  };
  const pickPeriod = (p: BillingPeriod) => {
    setPeriod(p);
    setDue(nextDue(p)); // a new period starts today
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSubscription(user.id, plan === 'premium'
        ? { plan, status, billing_period: period, current_period_end: due ? new Date(`${due}T23:59:59`).toISOString() : null }
        : { plan, status: 'active', billing_period: null, current_period_end: null });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
      setSaving(false);
    }
  };

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="neo neo-lg modal sub-modal" role="dialog" aria-modal="true" aria-labelledby="edit-sub-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={user.display_name} email={user.email} src={user.picture_uri} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 id="edit-sub-title">Edit subscription</h3>
            <div className="muted small" style={{ fontWeight: 500 }}>{user.display_name || user.email}</div>
          </div>
          <button className="icon-btn" style={{ background: 'var(--surface)' }} onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="field">
          <span className="label">Plan</span>
          <div className="plan-pick">
            <button type="button" className={`plan-opt free${plan === 'free' ? ' on' : ''}`} onClick={() => pickPlan('free')}>
              <span className="pt">Free</span>
              <span className="ps">Core study tools</span>
            </button>
            <button type="button" className={`plan-opt premium${plan === 'premium' ? ' on' : ''}`} onClick={() => pickPlan('premium')}>
              <span className="pt"><Icon name="crown" size={16} color="var(--gold)" strokeWidth={1.5} /> Premium</span>
              <span className="ps">Unlimited feature usage</span>
            </button>
          </div>
        </div>

        {plan === 'premium' && (
          <>
            <div className="field">
              <span className="label">Billing</span>
              <div className="period-pick">
                {PERIODS.map((p) => (
                  <button key={p.value} type="button" className={period === p.value ? 'on' : ''} onClick={() => pickPeriod(p.value)}>
                    <b>{p.label}</b>
                    <span>{p.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sub-row">
              <div className="field">
                <span className="label">Status</span>
                <Dropdown<SubscriptionStatus>
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'trialing', label: 'Trial' },
                    { value: 'canceled', label: 'Canceled' },
                    { value: 'expired', label: 'Expired' },
                  ]}
                />
              </div>
              <label className="field">
                <span className="label">Due date</span>
                <input className="input date-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </label>
            </div>
            <div className="sub-note">
              <Icon name="clock" size={14} /> Picking a billing period sets the due date to one {period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year'} from today. You can still change it.
            </div>
          </>
        )}

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-cream" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

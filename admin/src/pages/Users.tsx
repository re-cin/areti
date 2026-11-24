import { useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Dropdown } from '../components/Dropdown';
import { StatusSelect } from '../components/StatusSelect';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { PlanBadge, StatusLabel } from '../components/PlanBadge';
import { deleteUser, fetchUsers, setDisabled } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, timeAgo } from '../lib/format';
import { BILLING_LABEL, isPremium, type AdminUser } from '../lib/types';
import { useAsync } from '../lib/useAsync';

type Filter = 'all' | 'free' | 'premium' | 'disabled';
type SortKey = 'name' | 'subscription' | 'created_at' | 'last_active' | 'status';

const sorters: Record<SortKey, (a: AdminUser, b: AdminUser) => number> = {
  name: (a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email),
  // Premium first, then by renewal date.
  subscription: (a, b) =>
    Number(isPremium(b)) - Number(isPremium(a)) || (a.current_period_end ?? '').localeCompare(b.current_period_end ?? ''),
  created_at: (a, b) => a.created_at.localeCompare(b.created_at),
  last_active: (a, b) => lastActive(a) - lastActive(b),
  status: (a, b) => Number(a.disabled) - Number(b.disabled),
};

function lastActive(u: AdminUser) {
  return Math.max(u.last_focus_at ?? 0, u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0);
}

function downloadCsv(users: AdminUser[]) {
  const header = ['Name', 'Email', 'Admin', 'Disabled', 'Plan', 'Subscription status', 'Renews / ends', 'Joined', 'Last active', 'Focus minutes', 'Sessions'];
  const rows = users.map((u) => [
    u.display_name ?? '',
    u.email,
    u.is_admin ? 'yes' : 'no',
    u.disabled ? 'yes' : 'no',
    u.plan,
    u.subscription_status,
    u.current_period_end ?? '',
    u.created_at,
    lastActive(u) ? new Date(lastActive(u)).toISOString() : '',
    u.focus_minutes,
    u.sessions_count,
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `areti-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Green: active in the last day. Amber: this week. Grey: longer ago or never. */
function ActiveDot({ u }: { u: AdminUser }) {
  const t = lastActive(u);
  const age = t ? Date.now() - t : Infinity;
  const color = age < 86_400_000 ? 'var(--teal)' : age < 7 * 86_400_000 ? 'var(--gold)' : 'var(--line)';
  return (
    <span className="active-dot" style={{ ['--active' as string]: color }}>
      {timeAgo(t || null)}
    </span>
  );
}

export function Users() {
  const [params, setParams] = useSearchParams();
  const filter = (['free', 'premium', 'disabled'].includes(params.get('show') ?? '') ? params.get('show') : 'all') as Filter;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'created_at', dir: -1 });
  const navigate = useNavigate();

  const { data, error, loading, reload } = useAsync(fetchUsers);

  const users = useMemo(() => data ?? [], [data]);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState<AdminUser | null>(null);
  const { state: auth } = useAuth();
  const myId = auth.status === 'signedIn' ? auth.userId : '';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => (filter === 'all' ? true : filter === 'premium' ? isPremium(u) : filter === 'free' ? !isPremium(u) : u.disabled))
      .filter((u) => !q || u.email.toLowerCase().includes(q) || (u.display_name ?? '').toLowerCase().includes(q))
      .sort((a, b) => sorters[sort.key](a, b) * sort.dir);
  }, [users, filter, query, sort]);

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params);
    next.delete('plan');
    if (f === 'all') next.delete('show');
    else next.set('show', f);
    setParams(next, { replace: true });
  };

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      className={`sortable ${className ?? ''}`}
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : k === 'name' ? 1 : -1 }))}
      aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {/* Always takes the arrow's space, so the columns don't shift when you sort */}
        <span style={{ visibility: sort.key === k ? 'visible' : 'hidden', display: 'inline-flex' }}>
          <Icon name={sort.key === k && sort.dir === 1 ? 'chevronUp' : 'chevronDown'} size={13} strokeWidth={2.5} />
        </span>
      </span>
    </th>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Everyone with an areti account, and their subscription.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-cream btn-sm" onClick={reload} disabled={loading}>
            <Icon name="sync" size={15} /> Refresh
          </button>
          <button className="btn btn-sm" onClick={() => downloadCsv(visible)} disabled={!visible.length}>
            <Icon name="download" size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} color="var(--muted)" />
          <input className="input" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Dropdown<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All users' },
              { value: 'premium', label: 'Premium' },
              { value: 'free', label: 'Free' },
              { value: 'disabled', label: 'Disabled' },
            ]}
          />
        </div>
      </div>

      {error && <div className="neo card error" style={{ marginBottom: 18 }}>Could not load users: {error}</div>}

      <div className="neo table-wrap">
        <table className="utable">
          <thead>
            <tr>
              <Th k="name">User</Th>
              <th>Subscription</th>
              <th>Account</th>
              <Th k="last_active">Last active</Th>
              <Th k="created_at">Joined</Th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr><td colSpan={6}><div className="center" style={{ padding: 40 }}><div className="spinner" /></div></td></tr>
            )}
            {data && visible.length === 0 && (
              <tr><td colSpan={6} className="empty">No users match.</td></tr>
            )}
            {visible.map((u) => (
              <tr key={u.id} onClick={() => navigate(`/users/${u.id}`)}>
                <td>
                  <div className="user-cell">
                    <Avatar name={u.display_name} email={u.email} src={u.picture_uri} />
                    <div style={{ minWidth: 0 }}>
                      <div className="t">
                        {u.display_name || <span className="muted">No name yet</span>}
                      </div>
                      <div className="s">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="sub-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PlanBadge plan={u.plan} />
                      {u.plan === 'premium' && <StatusLabel status={u.subscription_status} />}
                    </div>
                    {u.plan === 'premium' && (
                      <span className="renew">
                        {u.billing_period && `${BILLING_LABEL[u.billing_period]} · `}
                        {u.subscription_status === 'active' || u.subscription_status === 'trialing' ? 'Renews' : 'Ended'}{' '}
                        {formatDate(u.current_period_end)}
                      </span>
                    )}
                  </div>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {u.is_admin
                    ? <span className="status-pill admin readonly" title="Admins can’t be disabled from here">Admin</span>
                    : <StatusSelect disabled={u.disabled} readOnly={u.id === myId} onChange={() => setToggling(u)} />}
                </td>
                <td><ActiveDot u={u} /></td>
                <td className="muted" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{formatDate(u.created_at)}</td>
                <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">
                    <button className="btn btn-sm btn-cream" onClick={() => navigate(`/users/${u.id}`)}>View</button>
                    {u.id === myId ? (
                      <span className="icon-btn ghost" title="You can’t delete your own account"><Icon name="trash" size={15} /></span>
                    ) : (
                      <button className="icon-btn danger" onClick={() => setDeleting(u)} title="Delete account" aria-label={`Delete ${u.email}`}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toggling && (
        <ConfirmModal
          title={toggling.disabled ? 'Enable this account?' : 'Disable this account?'}
          message={toggling.disabled
            ? <><b style={{ color: 'var(--ink)' }}>{toggling.email}</b> will be able to sign in again.</>
            : <><b style={{ color: 'var(--ink)' }}>{toggling.email}</b> will be signed out on every device and won’t be able to sign in. Their data stays, and you can enable the account again any time.</>}
          confirmLabel={toggling.disabled ? 'Enable account' : 'Disable account'}
          danger={!toggling.disabled}
          onConfirm={async () => { await setDisabled(toggling.id, !toggling.disabled); setToggling(null); void reload(); }}
          onClose={() => setToggling(null)}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this account?"
          message={<>This permanently deletes <b style={{ color: 'var(--ink)' }}>{deleting.email}</b>, their profile picture and all their study data. It can’t be undone.</>}
          confirmLabel="Delete forever"
          danger
          typeToConfirm={deleting.email}
          onConfirm={async () => { await deleteUser(deleting.id); setDeleting(null); void reload(); }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
